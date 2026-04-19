from rest_framework import generics
from .models import Measurement
from .serializers import MeasurementSerializer
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView

class MeasurementListCreateView(generics.ListCreateAPIView):
    queryset = Measurement.objects.all().order_by('-created_at')
    serializer_class = MeasurementSerializer


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