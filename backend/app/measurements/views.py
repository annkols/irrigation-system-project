from rest_framework import generics
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
        queryset = Measurement.objects.select_related('sensor').all().order_by('-created_at')

        sensor_id = self.request.query_params.get('sensor_id')

        if sensor_id:
            queryset = queryset.filter(sensor_id=sensor_id)

        return queryset

class MeasurementDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Measurement.objects.all()
    serializer_class = MeasurementSerializer

class MeasurementLatestView(APIView):
    def get(self, request):
        latest_measurement = Measurement.objects.order_by('-created_at').first()

        if not latest_measurement:
            return Response(
                {"detail": "Brak pomiarów w bazie."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = MeasurementSerializer(latest_measurement)
        return Response(serializer.data, status=status.HTTP_200_OK)