import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('emergency', '0002_alter_emergencyreport_options_and_more'),
        ('hospitals', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='EmergencyCase',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('uuid', models.UUIDField(db_index=True, default=uuid.uuid4, editable=False, unique=True)),
                ('verified_at', models.DateTimeField(blank=True, null=True)),
                ('rejected_at', models.DateTimeField(blank=True, null=True)),
                ('rejection_reason', models.TextField(blank=True, null=True)),
                ('case_status', models.CharField(choices=[('UNVERIFIED', 'Unverified Report'), ('VERIFIED', 'Verified Emergency Case'), ('REJECTED', 'Rejected Report'), ('DISPATCHED', 'Ambulance Dispatched'), ('IN_PROGRESS', 'Response In Progress'), ('COMPLETED', 'Case Resolved'), ('CANCELLED', 'Case Cancelled')], default='VERIFIED', max_length=30)),
                ('priority', models.CharField(choices=[('PENDING', 'Pending Assessment'), ('LOW', 'Low Risk (Green)'), ('MEDIUM', 'Moderate Risk (Yellow)'), ('HIGH', 'High Risk (Orange)'), ('CRITICAL', 'Critical Emergency (Red)')], default='PENDING', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('hospital', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='emergency_cases', to='hospitals.hospital')),
                ('rejected_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='rejected_cases', to=settings.AUTH_USER_MODEL)),
                ('source_report', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='operational_case', to='emergency.emergencyreport')),
                ('verified_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='verified_cases', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
