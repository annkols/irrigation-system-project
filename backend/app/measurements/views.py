from rest_framework import generics, status
from .models import Measurement
from .serializers import MeasurementSerializer
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

class MeasurementListCreateView(generics.ListCreateAPIView):
    serializer_class = MeasurementSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def get_queryset(self):
        queryset = Measurement.objects.all()

        station_number = self.request.query_params.get('station_number')
        pot_number = self.request.query_params.get('pot_number')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if station_number:
            queryset = queryset.filter(station_number=station_number)

        if pot_number:
            queryset = queryset.filter(pot_number=pot_number)

        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)

        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)

        return queryset


class MeasurementDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Measurement.objects.all()
    serializer_class = MeasurementSerializer
    permission_classes = [AllowAny]
    authentication_classes = []


class MeasurementLatestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        queryset = Measurement.objects.all()

        station_number = request.query_params.get('station_number')
        pot_number = request.query_params.get('pot_number')

        if station_number:
            queryset = queryset.filter(station_number=station_number)

        if pot_number:
            queryset = queryset.filter(pot_number=pot_number)

        latest_measurement = queryset.first()

        if not latest_measurement:
            return Response(
                {"detail": "Brak pomiarów w bazie."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = MeasurementSerializer(latest_measurement)
        return Response(serializer.data, status=status.HTTP_200_OK)