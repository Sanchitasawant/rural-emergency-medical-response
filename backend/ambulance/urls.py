from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AmbulanceViewSet, AmbulanceAssignmentViewSet

router = DefaultRouter()
router.register(r'ambulances', AmbulanceViewSet, basename='ambulance')
router.register(r'dispatch', AmbulanceAssignmentViewSet, basename='ambulance-dispatch')
router.register(r'assignments', AmbulanceAssignmentViewSet, basename='driver-assignments')

urlpatterns = [
    path('', include(router.urls)),
]
