import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('ambulance', '0002_ambulanceassignment'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='ambulanceassignment',
            name='accepted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='ambulanceassignment',
            name='arrived_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='ambulanceassignment',
            name='completed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='ambulanceassignment',
            name='patient_picked_up_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='ambulanceassignment',
            name='reached_hospital_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='ambulanceassignment',
            name='started_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='ambulanceassignment',
            name='status',
            field=models.CharField(choices=[('ASSIGNED', 'Dispatched / Assigned'), ('ACCEPTED', 'Accepted by Driver'), ('ON_THE_WAY', 'En Route to Incident'), ('ARRIVED', 'Arrived on Scene'), ('PATIENT_PICKED_UP', 'Patient Picked Up'), ('REACHED_HOSPITAL', 'Reached Hospital'), ('COMPLETED', 'Mission Completed'), ('CANCELLED', 'Assignment Cancelled')], default='ASSIGNED', max_length=30),
        ),
        migrations.CreateModel(
            name='ResponseEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('uuid', models.UUIDField(db_index=True, default=uuid.uuid4, editable=False, unique=True)),
                ('event_type', models.CharField(choices=[('ACCEPTED', 'Assignment Accepted'), ('STARTED', 'En Route Started'), ('ARRIVED', 'Arrived On Scene'), ('PATIENT_PICKED_UP', 'Patient Picked Up'), ('REACHED_HOSPITAL', 'Reached Hospital'), ('COMPLETED', 'Mission Completed'), ('LOCATION_UPDATE', 'Live Location Update'), ('CANCELLED', 'Assignment Cancelled')], max_length=40)),
                ('latitude', models.FloatField(blank=True, null=True)),
                ('longitude', models.FloatField(blank=True, null=True)),
                ('accuracy', models.FloatField(blank=True, null=True)),
                ('sync_status', models.CharField(default='SYNCED', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('assignment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='events', to='ambulance.ambulanceassignment')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='response_events', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
