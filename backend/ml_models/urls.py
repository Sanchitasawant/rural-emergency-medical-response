from django.urls import path
from .views import PredictRiskView

urlpatterns = [
    path('predict/', PredictRiskView.as_view(), name='ml-predict'),
]
