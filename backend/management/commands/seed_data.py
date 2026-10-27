from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from hospitals.models import Hospital
from ambulance.models import Ambulance

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds initial production-like test data for RuralCare AI'

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding database with initial users, hospitals, and ambulances...")

        # 1. Create Hospitals
        h1, _ = Hospital.objects.get_or_create(
            name="District General Hospital Pune",
            defaults={
                "district": "Pune Rural",
                "address": "NH-48, Khed Shivapur, Pune",
                "contact_number": "+91-9823011223",
                "icu_beds_available": 12,
                "general_beds_available": 45,
                "has_trauma_center": True,
                "latitude": 18.3512,
                "longitude": 73.8412
            }
        )
        h2, _ = Hospital.objects.get_or_create(
            name="Sub-District Care Center Baramati",
            defaults={
                "district": "Baramati Rural",
                "address": "Main Road, Near Bus Stand, Baramati",
                "contact_number": "+91-9823044556",
                "icu_beds_available": 5,
                "general_beds_available": 20,
                "has_trauma_center": False,
                "latitude": 18.1517,
                "longitude": 74.5770
            }
        )

        # 2. Create Seed Accounts
        accounts = [
            {"username": "admin", "email": "admin@ruralcare.org", "password": "adminpassword123", "role": "ADMIN", "first_name": "System", "last_name": "Administrator"},
            {"username": "staff", "email": "staff@hospital.org", "password": "staffpassword123", "role": "HOSPITAL_STAFF", "first_name": "Dr. Ananya", "last_name": "Deshmukh", "hospital_name": h1.name},
            {"username": "worker", "email": "worker@ruralcare.org", "password": "workerpassword123", "role": "EMERGENCY_WORKER", "first_name": "Ramesh", "last_name": "Patil", "badge_id": "EW-8892"},
            {"username": "driver", "email": "driver@ruralcare.org", "password": "driverpassword123", "role": "DRIVER", "first_name": "Suresh", "last_name": "Pawar", "badge_id": "DR-4401"},
            {"username": "citizen", "email": "citizen@gmail.com", "password": "citizenpassword123", "role": "CITIZEN", "first_name": "Priya", "last_name": "Sharma", "phone": "+91-9988776655"},
        ]

        for acc in accounts:
            if not User.objects.filter(username=acc['username']).exists():
                u = User.objects.create_user(**acc)
                if acc['role'] == 'ADMIN':
                    u.is_superuser = True
                    u.is_staff = True
                    u.save()
                self.stdout.write(f"Created account: {u.username} ({u.role})")
            else:
                self.stdout.write(f"Account {acc['username']} already exists.")

        # 3. Create Ambulances
        driver_user = User.objects.filter(username='driver').first()

        amb1, _ = Ambulance.objects.get_or_create(
            vehicle_number="MH-12-AMB-101",
            defaults={
                "vehicle_type": "Advance Life Support (ALS)",
                "hospital": h1,
                "driver": driver_user,
                "status": "AVAILABLE",
                "latitude": 18.3520,
                "longitude": 73.8415
            }
        )
        amb2, _ = Ambulance.objects.get_or_create(
            vehicle_number="MH-12-AMB-202",
            defaults={
                "vehicle_type": "Basic Life Support (BLS)",
                "hospital": h2,
                "status": "AVAILABLE",
                "latitude": 18.1520,
                "longitude": 74.5780
            }
        )

        self.stdout.write(self.style.SUCCESS("Successfully seeded initial RuralCare AI dataset!"))
