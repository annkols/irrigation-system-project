import csv
import json
from django.http import HttpResponse
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
    
class MeasurementExportCSVView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, experiment_id):
        from experiments.models import Experiment

        try:
            experiment = Experiment.objects.get(pk=experiment_id)
        except Experiment.DoesNotExist:
            return Response({"detail": "Experiment not found."}, status=404)

        queryset = Measurement.objects.all()
        if experiment.started_at:
            queryset = queryset.filter(created_at__gte=experiment.started_at)
        if experiment.planned_end_at:
            queryset = queryset.filter(created_at__lte=experiment.planned_end_at)

        export_format = request.query_params.get('export_format', 'csv')

        if export_format == 'json':
            data = [
                {
                    'timestamp': str(m.created_at),
                    'station': m.station_number,
                    'pot': m.pot_number,
                    'moisture_%': m.moisture_percent,
                    'air_temp_C': m.air_temperature,
                    'air_humidity_%': m.air_humidity,
                    'pressure_hpa': m.pressure_hpa,
                    'soil_temp_C': m.soil_temperature,
                    'light_lux': m.light_lux,
                    'pump_on': m.pump_on,
                }
                for m in queryset
            ]
            response = HttpResponse(
                json.dumps(data, indent=2),
                content_type='application/json'
            )
            response['Content-Disposition'] = f'attachment; filename="experiment_{experiment_id}.json"'
            return response

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="experiment_{experiment_id}.csv"'

        writer = csv.writer(response)
        writer.writerow(['timestamp', 'station', 'pot', 'moisture_%', 'air_temp_C', 'air_humidity_%', 'pressure_hpa', 'soil_temp_C', 'light_lux', 'pump_on'])

        for m in queryset:
            writer.writerow([m.created_at, m.station_number, m.pot_number, m.moisture_percent, m.air_temperature, m.air_humidity, m.pressure_hpa, m.soil_temperature, m.light_lux, m.pump_on])

        return response
