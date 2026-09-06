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

    def get_queryset(self):
        queryset = super().get_queryset()
        station_number = self.request.query_params.get('station_number')
        pot_number = self.request.query_params.get('pot_number')
        if station_number:
            queryset = queryset.filter(station_number=station_number)
        if pot_number:
            queryset = queryset.filter(pot_number=pot_number)
        return queryset


class PumpCommandLatestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        queryset = PumpCommand.objects.all()
        station_number = request.query_params.get('station_number')
        pot_number = request.query_params.get('pot_number')
        if station_number:
            queryset = queryset.filter(station_number=station_number)
        if pot_number:
            queryset = queryset.filter(pot_number=pot_number)
        latest_command = queryset.first()

        if not latest_command:
            return Response(
                {'detail': 'Brak komend sterowania pompa.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = PumpCommandSerializer(latest_command)
        return Response(serializer.data, status=status.HTTP_200_OK)
