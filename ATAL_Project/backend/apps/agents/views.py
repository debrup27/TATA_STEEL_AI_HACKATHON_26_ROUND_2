from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from apps.agents.models import ChatSession, ChatMessage
import uuid


class ChatSessionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = ChatSession.objects.filter(user=request.user).order_by("-last_active")
        data = [
            {
                "id": str(s.id),
                "asset_id": str(s.asset_id) if s.asset_id else None,
                "created_at": s.created_at,
                "last_active": s.last_active,
                "metadata": s.session_metadata,
            }
            for s in sessions
        ]
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


class ChatMessageView(APIView):
    """
    POST /api/v1/chat/<session_id>/message/
    Sync: assembles context, calls LLM, streams via WS group, saves messages.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        from apps.agents.tasks import process_chat_message
        try:
            session = ChatSession.objects.get(id=session_id, user=request.user)
        except ChatSession.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        user_message = request.data.get("content", "").strip()
        if not user_message:
            return Response({"error": "content required"}, status=status.HTTP_400_BAD_REQUEST)

        # Save user message
        msg = ChatMessage.objects.create(
            session=session,
            role="user",
            content=user_message,
        )
        session.last_active = msg.timestamp
        session.save(update_fields=["last_active"])

        rag_collections = request.data.get("rag_collections", [])
        task = process_chat_message.apply_async(
            args=[str(session.id), str(msg.id), rag_collections]
        )
        return Response({"task_id": task.id, "message_id": str(msg.id)}, status=status.HTTP_202_ACCEPTED)
