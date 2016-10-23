from rest_framework import status
from image_app.models import ImageUser
from image_app.tests.testutil import BasicImageTest


class LabelCreateTests(BasicImageTest):

    def setUp(self):
        self.superuser = ImageUser.objects.create_superuser('admin', 'jon@snow.com', self.PW)
        self.login(username='admin')
        self.logout()

    def test_superuser_can_create_label(self):
        """
        Verify you can list all users.
        """

        label = {
            'value': 'label value!'
        }

        self.login(username='admin')
        response = self.client.post('/api/v1/label', label)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.verify_built(label, response.data)
        self.logout()


