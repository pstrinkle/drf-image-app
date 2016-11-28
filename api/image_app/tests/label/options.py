from rest_framework import status
from image_app.models import ImageUser
from image_app.tests.testutil import BasicImageTest


class LabelOptionsTests(BasicImageTest):

    def setUp(self):
        self.superuser = ImageUser.objects.create_superuser('admin', 'jon@snow.com', self.PW)
        self.login(username='admin')
        self.logout()

    def test_superuser_can_options_labels(self):
        """
        Verify you can list all users.
        """

        self.login(username='admin')
        response = self.client.options('/api/v1/label')
        self.logout()


