from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PumpCommand
from .serializers import PumpCommandSerializer


class PumpCommandListCreateView(generics.ListCreateAPIView):
    queryset = PumpCommand.objects.all()
    serializer_class = PumpCommandSerializer
    permission_classes = [AllowAny]
    authentication_classes = []


class PumpCommandLatestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        latest_command = PumpCommand.objects.first()

        if not latest_command:
            return Response(
                {'detail': 'Brak komend sterowania pompa.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = PumpCommandSerializer(latest_command)
        return Response(serializer.data, status=status.HTTP_200_OK)
