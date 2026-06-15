from django.db.models import OuterRef, Subquery
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from apps.agents.models import ChatSession, ChatMessage, ChatMessageFeedback
import logging
import uuid

logger = logging.getLogger(__name__)


class ChatSessionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        last_user = ChatMessage.objects.filter(
            session=OuterRef("pk"), role="user"
        ).order_by("-timestamp")
        sessions = (
            ChatSession.objects.filter(user=request.user)
            .annotate(
                last_message_content=Subquery(last_user.values("content")[:1]),
                last_message_role=Subquery(last_user.values("role")[:1]),
            )
            .order_by("-last_active")
        )
        data = []
        for s in sessions:
            entry = {
                "id": str(s.id),
                "asset_id": str(s.asset_id) if s.asset_id else None,
                "created_at": s.created_at,
                "last_active": s.last_active,
                "metadata": s.session_metadata,
            }
            if s.last_message_content:
                entry["last_message"] = {
                    "role": s.last_message_role or "user",
                    "content": s.last_message_content,
                }
            data.append(entry)
        return Response(data)

    def post(self, request):
        session = ChatSession.objects.create(
            user=request.user,
            asset_id=request.data.get("asset_id"),
            session_metadata=request.data.get("metadata", {}),
        )
        return Response({"id": str(session.id)}, status=status.HTTP_201_CREATED)


class ChatSessionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        try:
            session = ChatSession.objects.get(id=session_id, user=request.user)
        except ChatSession.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        messages = ChatMessage.objects.filter(session=session).order_by("timestamp")
        feedback_map = {
            str(f.message_id): f.rating
            for f in ChatMessageFeedback.objects.filter(
                message__session=session,
                user=request.user,
            )
        }
        data = {
            "id": str(session.id),
            "asset_id": str(session.asset_id) if session.asset_id else None,
            "created_at": session.created_at,
            "last_active": session.last_active,
            "metadata": session.session_metadata,
            "messages": [
                {
                    "id": str(m.id),
                    "role": m.role,
                    "content": m.content,
                    "reasoning": m.reasoning or "",
                    "citations": m.citations,
                    "shap_context": m.shap_context,
                    "model_used": m.model_used,
                    "token_usage": m.token_usage,
                    "created_at": m.timestamp,
                    "feedback_rating": feedback_map.get(str(m.id)),
                }
                for m in messages
            ],
        }
        return Response(data)

    def delete(self, request, session_id):
        try:
            session = ChatSession.objects.get(id=session_id, user=request.user)
        except ChatSession.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        try:
            from apps.agents.stream_registry import request_cancel

            request_cancel(str(session_id))
        except Exception:
            pass
        try:
            session.delete()
        except Exception as exc:
            logger.exception("chat session delete failed session=%s", session_id)
            return Response(
                {"error": f"Could not delete session: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChatCancelView(APIView):
    """POST /api/v1/chat/sessions/<session_id>/cancel/ — stop in-flight generation."""

    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        try:
            ChatSession.objects.get(id=session_id, user=request.user)
        except ChatSession.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        try:
            from apps.agents.stream_registry import request_cancel

            request_cancel(str(session_id))
        except Exception as exc:
            logger.warning("chat cancel failed session=%s err=%s", session_id, exc)
            return Response(
                {"error": "could not cancel stream"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({"status": "cancelled"})


class ChatWarmupView(APIView):
    """
    POST /api/v1/chat/warmup/
    Pre-load Ollama + RAG models in background so the first user message is fast.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import threading
        from apps.agents.ollama_warmup import warm_inference_stack

        threading.Thread(
            target=warm_inference_stack,
            kwargs={"rag": False},
            daemon=True,
            name="manas-warmup",
        ).start()
        return Response({"status": "warming"})


class ChatCompactView(APIView):
    """
    POST /api/v1/chat/sessions/<session_id>/compact/
    Manually summarise older messages (same as auto-compaction, without sending a chat turn).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        import threading

        from apps.agents.compaction import compact_history

        try:
            session = ChatSession.objects.get(id=session_id, user=request.user)
        except ChatSession.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        sid = str(session.id)

        def _run():
            compact_history(sid, force=True)

        threading.Thread(target=_run, daemon=True, name=f"manas-compact-{sid[:8]}").start()
        return Response({"status": "compacting"}, status=status.HTTP_202_ACCEPTED)


class ChatSansadModeActivateView(APIView):
    """
    POST /api/v1/chat/sessions/<session_id>/sansad-mode/activate/
    Harvest plant-wide SANSAD context via 0.8b and persist briefing on the session.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        import threading

        from apps.agents.sansad_context_mode import activate_sansad_mode

        try:
            session = ChatSession.objects.get(id=session_id, user=request.user)
        except ChatSession.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        sid = str(session.id)

        def _run():
            activate_sansad_mode(sid)

        threading.Thread(target=_run, daemon=True, name=f"sansad-activate-{sid[:8]}").start()
        return Response({"status": "syncing"}, status=status.HTTP_202_ACCEPTED)


class ChatSansadModeDeactivateView(APIView):
    """
    POST /api/v1/chat/sessions/<session_id>/sansad-mode/deactivate/
    Clear persistent SANSAD context mode for this chat session.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        from apps.agents.sansad_context_mode import deactivate_sansad_mode

        try:
            ChatSession.objects.get(id=session_id, user=request.user)
        except ChatSession.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        deactivate_sansad_mode(str(session_id))
        return Response({"status": "deactivated"})


class ChatSansadModeUpdateView(APIView):
    """
    POST /api/v1/chat/sessions/<session_id>/sansad-mode/update/
    Re-harvest plant context via 0.8b and replace the existing briefing.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        import threading

        from apps.agents.sansad_context_mode import update_sansad_context

        try:
            session = ChatSession.objects.get(id=session_id, user=request.user)
        except ChatSession.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        meta = session.session_metadata or {}
        if not meta.get("sansad_mode"):
            return Response(
                {"error": "SANSAD mode is not active — use /sansad first"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sid = str(session.id)

        def _run():
            try:
                update_sansad_context(sid)
            except Exception as exc:
                logger.exception("sansad update failed session=%s", sid)
                from apps.agents.stream_registry import send_to_stream

                send_to_stream(sid, {
                    "type": "sansad_synced",
                    "error": str(exc),
                    "preview": "",
                    "refresh": True,
                    "replace": True,
                })

        threading.Thread(target=_run, daemon=True, name=f"sansad-update-{sid[:8]}").start()
        return Response({"status": "syncing"}, status=status.HTTP_202_ACCEPTED)


class ChatOptimizePromptView(APIView):
    """
    POST /api/v1/chat/optimize-prompt/
    Rewrite a user draft into a MANAS-scoped maintenance diagnostics prompt.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from apps.agents.prompt_optimizer import optimize_maintenance_prompt

        draft = (request.data.get("draft") or "").strip()
        if not draft:
            return Response({"error": "draft required"}, status=status.HTTP_400_BAD_REQUEST)

        has_rag = bool(request.data.get("has_rag_context", False))
        user_role = (request.data.get("user_role") or "").strip()

        try:
            result = optimize_maintenance_prompt(
                draft,
                has_rag_context=has_rag,
                user_role=user_role,
            )
        except Exception as exc:
            return Response(
                {"error": f"optimizer unavailable: {exc}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if result.get("action") == "block":
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        return Response(result)


class ChatMessageFeedbackView(APIView):
    """
    POST /api/v1/chat/messages/<message_id>/feedback/
    Body: { "rating": "up" | "down" }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, message_id):
        from apps.agents.preference_profile import analyze_response_traits, record_message_feedback

        rating = (request.data.get("rating") or "").strip().lower()
        if rating not in ("up", "down"):
            return Response({"error": "rating must be 'up' or 'down'"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            message = ChatMessage.objects.select_related("session").get(id=message_id)
        except ChatMessage.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if message.session.user_id != request.user.id:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if message.role != ChatMessage.Role.ASSISTANT:
            return Response({"error": "only assistant messages can be rated"}, status=status.HTTP_400_BAD_REQUEST)

        traits = analyze_response_traits(message.content)
        ChatMessageFeedback.objects.update_or_create(
            message=message,
            user=request.user,
            defaults={"rating": rating, "traits_snapshot": traits},
        )
        profile = record_message_feedback(request.user, message, rating)

        return Response({
            "status": "recorded",
            "rating": rating,
            "style_summary": profile.get("summary", ""),
        })


class ChatMessageView(APIView):
    """
    POST /api/v1/chat/<session_id>/message/
    Sync: assembles context, calls LLM, streams via WS group, saves messages.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        from apps.agents.tasks import start_chat_thread
        try:
            session = ChatSession.objects.get(id=session_id, user=request.user)
        except ChatSession.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        user_message = request.data.get("content", "").strip()
        if not user_message:
            return Response({"error": "content required"}, status=status.HTTP_400_BAD_REQUEST)

        msg = ChatMessage.objects.create(
            session=session,
            role="user",
            content=user_message,
        )
        session.last_active = msg.timestamp
        session.save(update_fields=["last_active"])

        rag_collections = request.data.get("rag_collections", [])
        rag_document_titles = request.data.get("rag_document_titles", [])
        rag_document_ids = request.data.get("rag_document_ids", [])
        custom_rag_context = request.data.get("custom_rag_context", "")
        custom_documents = request.data.get("custom_documents", [])
        user_role = request.data.get("user_role", "")
        advice_mode = bool(request.data.get("advice_mode", False))
        deep_thinking = bool(request.data.get("deep_thinking", False))
        t = start_chat_thread(
            str(session.id),
            str(msg.id),
            rag_collections,
            rag_document_titles=rag_document_titles,
            rag_document_ids=rag_document_ids,
            custom_rag_context=custom_rag_context,
            custom_documents=custom_documents,
            user_role=user_role,
            advice_mode=advice_mode,
            deep_thinking=deep_thinking,
        )
        return Response({"task_id": t.name, "message_id": str(msg.id)}, status=status.HTTP_202_ACCEPTED)
