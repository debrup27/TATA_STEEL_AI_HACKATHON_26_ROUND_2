from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


class ATALTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["username"] = user.username
        token["role"] = user.role
        token["full_name"] = f"{user.first_name} {user.last_name}".strip() or user.username
        return token


class ATALTokenObtainPairView(TokenObtainPairView):
    serializer_class = ATALTokenObtainPairSerializer
