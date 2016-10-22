from rest_framework import status
from image_app.models import ImageUser
from image_app.tests.testutil import BasicImageTest


class CatoUserListTests(BasicImageTest):

    def setUp(self):
        self.superuser = ImageUser.objects.create_superuser('admin', 'jon@snow.com', self.PW)
        self.login(username='admin')
        self.logout()

    def test_superuser_can_list_users(self):
        """
        Verify you can list all users.
        """

        self.login(username='admin')
        response = self.client.get('/api/v1/user')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.logout()


