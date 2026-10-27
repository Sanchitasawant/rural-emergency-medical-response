import math
from .models import Ambulance

class AmbulanceSelectionService:
    @staticmethod
    def haversine_distance(lat1, lon1, lat2, lon2):
        """
        Calculates straight-line distance in kilometers between two GPS coordinates using Haversine formula.
        Returns distance in km or None if coordinates are missing.
        """
        if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
            return None
        
        try:
            R = 6371.0  # Earth radius in kilometers
            dlat = math.radians(float(lat2) - float(lat1))
            dlon = math.radians(float(lon2) - float(lon1))
            a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(float(lat1))) * math.cos(math.radians(float(lat2))) * math.sin(dlon / 2.0) ** 2
            c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
            return round(R * c, 2)
        except (ValueError, TypeError):
            return None

    @classmethod
    def get_eligible_ambulances(cls, emergency_case=None):
        """
        Returns list of ambulances currently eligible for new dispatch (status == 'AVAILABLE').
        If emergency_case location is present, calculates distance_km for each vehicle.
        """
        available_qs = Ambulance.objects.filter(status='AVAILABLE').select_related('hospital', 'driver')
        
        case_lat = None
        case_lon = None
        if emergency_case and emergency_case.source_report:
            case_lat = emergency_case.source_report.latitude
            case_lon = emergency_case.source_report.longitude

        results = []
        for amb in available_qs:
            dist_km = cls.haversine_distance(amb.latitude, amb.longitude, case_lat, case_lon)
            results.append({
                "ambulance": amb,
                "distance_km": dist_km,
                "has_gps": dist_km is not None
            })

        # Sort by distance if available, otherwise by vehicle_number
        results.sort(key=lambda x: (x['distance_km'] if x['distance_km'] is not None else 999999, x['ambulance'].vehicle_number))
        return results
