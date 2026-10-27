import re
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.core.validators import validate_email

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = ('id', 'uuid', 'username', 'email', 'first_name', 'last_name', 'full_name', 'phone_number', 'role', 'hospital_name', 'badge_id', 'is_active', 'created_at', 'last_login')
        read_only_fields = ('id', 'uuid', 'created_at', 'last_login')

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, required=True, min_length=8)
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'email', 'phone_number', 'password', 'confirm_password')

    def validate_email(self, value):
        try:
            validate_email(value)
        except Exception:
            raise serializers.ValidationError("Please provide a valid email address.")
        
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email address is already registered.")
        return value.lower()

    def validate_phone_number(self, value):
        if value and not re.match(r'^\+?[0-9\s\-]{8,20}$', value):
            raise serializers.ValidationError("Please provide a valid phone number.")
        return value

    def validate(self, attrs):
        password = attrs.get('password')
        confirm_password = attrs.get('confirm_password')

        if password != confirm_password:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})

        if len(password) < 8:
            raise serializers.ValidationError({"password": "Password must contain at least 8 characters."})

        if not re.search(r'[A-Za-z]', password) or not re.search(r'[0-9]', password):
            raise serializers.ValidationError({"password": "Password must contain both letters and numbers."})

        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password', None)
        password = validated_data.pop('password')
        email = validated_data.pop('email')
        username = email.split('@')[0]

        # Public self-registration ALWAYS locks role to CITIZEN
        user = User.objects.create_user(
            email=email,
            username=username,
            password=password,
            role='CITIZEN',
            **validated_data
        )
        return user
