from django.urls import path
from .views import BatchSyncView

urlpatterns = [
    path('', BatchSyncView.as_view(), name='sync-main'),
    path('batch/', BatchSyncView.as_view(), name='sync-batch'),
]
