from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APITestCase

User = get_user_model()

STRONG_PASSWORD = "Pulse-Tasks-2026!"


class AuthFlowTests(APITestCase):
    def setUp(self):
        cache.clear()

    def register(self, **overrides):
        payload = {"full_name": "Ada Lovelace", "email": "ada@example.com", "password": STRONG_PASSWORD}
        payload.update(overrides)
        return self.client.post("/api/auth/register/", payload, format="json")

    def test_register_returns_tokens_and_user(self):
        res = self.register(email="Ada@Example.com")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)
        self.assertEqual(res.data["user"]["email"], "ada@example.com")
        self.assertEqual(res.data["user"]["full_name"], "Ada Lovelace")
        self.assertTrue(User.objects.get(email="ada@example.com").check_password(STRONG_PASSWORD))

    def test_register_rejects_duplicate_email_case_insensitively(self):
        self.register()
        res = self.register(email="ADA@example.com")
        self.assertEqual(res.status_code, 400)
        self.assertIn("email", res.data)

    def test_register_rejects_weak_password(self):
        res = self.register(password="12345678")
        self.assertEqual(res.status_code, 400)
        self.assertIn("password", res.data)

    def test_register_requires_full_name(self):
        res = self.register(full_name="")
        self.assertEqual(res.status_code, 400)
        self.assertIn("full_name", res.data)

    def test_login_and_me(self):
        self.register()
        res = self.client.post(
            "/api/auth/login/", {"email": "ADA@example.com", "password": STRONG_PASSWORD}, format="json"
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data["email"], "ada@example.com")

    def test_login_with_wrong_password_fails(self):
        self.register()
        res = self.client.post("/api/auth/login/", {"email": "ada@example.com", "password": "nope"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["non_field_errors"][0], "Invalid email or password.")

    def test_me_requires_auth(self):
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)

    def test_refresh_and_logout_blacklists_refresh_token(self):
        tokens = self.register().data
        refreshed = self.client.post("/api/auth/refresh/", {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(refreshed.status_code, 200)
        new_refresh = refreshed.data["refresh"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refreshed.data['access']}")
        self.assertEqual(self.client.post("/api/auth/logout/", {"refresh": new_refresh}, format="json").status_code, 205)

        self.client.credentials()
        again = self.client.post("/api/auth/refresh/", {"refresh": new_refresh}, format="json")
        self.assertEqual(again.status_code, 401)

    def test_health(self):
        self.assertEqual(self.client.get("/api/health/").json(), {"status": "ok"})
