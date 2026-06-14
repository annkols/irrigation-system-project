import csv
from io import BytesIO
from django.http import HttpResponse
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, status
from .models import Measurement
from .serializers import MeasurementSerializer
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
import openpyxl


def measurement_filter_for_table_configs(table_configs):
    query = Q()

    for config in table_configs:
        query |= Q(
            table_number=config["table_number"],
            pot_number__lte=config["pot_count"]
        )

    return query

class MeasurementListCreateView(generics.ListCreateAPIView):
    serializer_class = MeasurementSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def get_queryset(self):
        queryset = Measurement.objects.all()

        table_number = self.request.query_params.get('table_number')
        table_number_max = self.request.query_params.get('table_number_max')
        pot_number = self.request.query_params.get('pot_number')
        pot_number_max = self.request.query_params.get('pot_number_max')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        limit = self.request.query_params.get('limit')

        if table_number:
            queryset = queryset.filter(table_number=table_number)

        if table_number_max:
            queryset = queryset.filter(table_number__lte=table_number_max)

        if pot_number:
            queryset = queryset.filter(pot_number=pot_number)

        if pot_number_max:
            queryset = queryset.filter(pot_number__lte=pot_number_max)

        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)

        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)

        if limit:
            try:
                limit_value = max(1, min(int(limit), 1000))
                queryset = queryset[:limit_value]
            except ValueError:
                pass

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

        table_number = request.query_params.get('table_number')
        pot_number = request.query_params.get('pot_number')

        if table_number:
            queryset = queryset.filter(table_number=table_number)

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

        queryset = Measurement.objects.filter(
            measurement_filter_for_table_configs(experiment.normalized_table_configs())
        ).order_by('created_at')
        if experiment.started_at:
            queryset = queryset.filter(created_at__gte=experiment.started_at)
        if experiment.planned_end_at:
            queryset = queryset.filter(created_at__lte=experiment.planned_end_at)

        export_format = request.query_params.get('export_format', 'csv')

        ALL_COLUMNS = {
            'moisture_percent': ('moisture_%',    lambda m: m.moisture_percent),
            'air_temperature':  ('air_temp_C',    lambda m: m.air_temperature),
            'air_humidity':     ('air_humidity_%', lambda m: m.air_humidity),
            'pressure_hpa':     ('pressure_hpa',  lambda m: m.pressure_hpa),
            'soil_temperature': ('soil_temp_C',   lambda m: m.soil_temperature),
            'light_lux':        ('light_lux',     lambda m: m.light_lux),
            'pump_on':          ('pump_on',       lambda m: m.pump_on),
        }

        columns_param = request.query_params.get('columns', '')
        selected_keys = [k for k in columns_param.split(',') if k in ALL_COLUMNS] if columns_param else list(ALL_COLUMNS.keys())

        def format_timestamp(value):
            return timezone.localtime(value).strftime('%Y-%m-%d %H:%M:%S')

        if export_format == 'excel':
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = f"Experiment {experiment_id}"

            ws.append(['timestamp', 'table', 'pot'] + [ALL_COLUMNS[k][0] for k in selected_keys])

            for m in queryset:
                row = [format_timestamp(m.created_at), m.table_number, m.pot_number] + [ALL_COLUMNS[k][1](m) for k in selected_keys]
                ws.append(row)

            buffer = BytesIO()
            wb.save(buffer)
            buffer.seek(0)

            response = HttpResponse(
                buffer.read(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="experiment_{experiment_id}.xlsx"'
            return response

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="experiment_{experiment_id}.csv"'

        writer = csv.writer(response)
        writer.writerow(['timestamp', 'table', 'pot'] + [ALL_COLUMNS[k][0] for k in selected_keys])

        for m in queryset:
            row = [format_timestamp(m.created_at), m.table_number, m.pot_number] + [ALL_COLUMNS[k][1](m) for k in selected_keys]
            writer.writerow(row)

        return response

