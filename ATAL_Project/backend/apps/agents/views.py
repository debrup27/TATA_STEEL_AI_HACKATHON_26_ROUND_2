from django.db.models import OuterRef, Subquery
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from apps.agents.models import ChatSession, ChatMessage
import uuid


class ChatSessionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        last_messages = ChatMessage.objects.filter(session=OuterRef("pk")).order_by("-timestamp")
        sessions = (
            ChatSession.objects.filter(user=request.user)
            .annotate(
                last_message_content=Subquery(last_messages.values("content")[:1]),
                last_message_role=Subquery(last_messages.values("role")[:1]),
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
                    "role": s.last_message_role,
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
        data = {
            "id": str(session.id),
            "asset_id": str(session.asset_id) if session.asset_id else None,
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
        session.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


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
        custom_rag_context = request.data.get("custom_rag_context", "")
        custom_documents = request.data.get("custom_documents", [])
        user_role = request.data.get("user_role", "")
        deep_thinking = bool(request.data.get("deep_thinking", False))
        t = start_chat_thread(
            str(session.id),
            str(msg.id),
            rag_collections,
            rag_document_titles=rag_document_titles,
            custom_rag_context=custom_rag_context,
            custom_documents=custom_documents,
            user_role=user_role,
            deep_thinking=deep_thinking,
        )
        return Response({"task_id": t.name, "message_id": str(msg.id)}, status=status.HTTP_202_ACCEPTED)
