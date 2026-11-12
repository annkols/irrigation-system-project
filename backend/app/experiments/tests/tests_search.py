
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone

from datetime import timedelta

from rest_framework import status
from rest_framework.test import APITestCase

from experiments.models import Experiment, Keyword

User = get_user_model()


class ExperimentPublicSearchTests(APITestCase):

    def setUp(self):

        self.url = reverse("experiment-public-search")

        self.user = User.objects.create_user(
            username="user",
            email="user@example.com",
            password="UserPass123!",
            is_active=True,
        )
        self.client.force_authenticate(user=self.user)

        self.other_user = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="UserPass123!",
            is_active=True,
        )
        
        started_at = timezone.now()
        planned_end_at = started_at + timedelta(days=7)

        self.public_experiment = Experiment.objects.create(
            name="Potato test",
            description="Testing potato irrigation.",
            plant_name="Potato",
            sensor_set_id=1,
            started_at=started_at.isoformat(),
            planned_end_at=planned_end_at.isoformat(),
            finished_at=None,
            owner=self.user,
            is_public=True
        )

        self.private_experiment = Experiment.objects.create(
            name="Tomato test",
            description="Testing tomato irrigation.",
            plant_name="Tomato",
            sensor_set_id=2,
            started_at=started_at.isoformat(),
            planned_end_at=planned_end_at.isoformat(),
            finished_at=None,
            owner=self.other_user,
            is_public=False
        )


        self.second_public_experiment = Experiment.objects.create(
            name="Public wheat test",
            description="Testing drought resistance.",
            plant_name="Wheat",
            owner=self.user,
            sensor_set_id=3,
            is_public=True,
        )

        salinity_keyword = Keyword.objects.create(name="salinity")
        irrigation_keyword = Keyword.objects.create(name="irrigation")
        potato_keyword = Keyword.objects.create(name="potato")
        wheat_keyword = Keyword.objects.create(name="wheat")
        another_keyword = Keyword.objects.create(name="another keyword")
        drought_keyword = Keyword.objects.create(name="drought")

        self.public_experiment.keywords.add(
            salinity_keyword,
            irrigation_keyword,
            potato_keyword,
            another_keyword,
            drought_keyword
        )

        self.private_experiment.keywords.add(salinity_keyword)

        self.second_public_experiment.keywords.add(
            wheat_keyword,
            drought_keyword,
        )


    def test_public_search_filters_by_keywords_and_hides_private_experiments(self):

        response = self.client.get(self.url,
            {"keywords": "salinity"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([experiment["id"] for experiment in response.data],[self.public_experiment.pk])

    def test_public_search_requires_authentication(self):

        self.client.force_authenticate(user=None)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


    def test_search_without_filters_returns_all_public_experiments(self):

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertCountEqual([experiment["id"] for experiment in response.data],
            [self.public_experiment.pk, self.second_public_experiment.pk],
        )


    def test_search_matches_experiment_name_case_insensitively(self):

        response = self.client.get(self.url, {"search": "POTATO TEST"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [experiment["id"] for experiment in response.data],
            [self.public_experiment.pk],
        )


    def test_search_matches_experiment_description(self):

        response = self.client.get(self.url, {"search": "Testing potato irrigation"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [experiment["id"] for experiment in response.data],
            [self.public_experiment.pk],
        )


    def test_search_matches_plant_name(self):

        response = self.client.get(self.url, {"search": "Potato"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [experiment["id"] for experiment in response.data],
            [self.public_experiment.pk],
        )


    def test_search_matches_keyword_name(self):

        response = self.client.get(self.url, {"search": "another keyword"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [experiment["id"] for experiment in response.data],
            [self.public_experiment.pk],
        )


    def test_search_normalizes_keyword_parameter(self):

        response = self.client.get(self.url, {"keywords": "  salinity  "})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [experiment["id"] for experiment in response.data],
            [self.public_experiment.pk],
        )


    def test_search_matches_any_of_multiple_keywords(self):

        response = self.client.get(
            self.url,
            {"keywords": "salinity,wheat"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertCountEqual(
            [experiment["id"] for experiment in response.data],
            [self.public_experiment.pk, self.second_public_experiment.pk],
        )


    def test_search_combines_text_and_keyword_filters(self):

        response = self.client.get(
            self.url,
            {
                "search": "test",
                "keywords": "another keyword",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [experiment["id"] for experiment in response.data],
            [self.public_experiment.pk],
        )


    def test_search_does_not_return_duplicate_experiments(self):

        response = self.client.get(self.url,
            {"keywords": "salinity,drought"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(len(response.data), 2)
        self.assertCountEqual(
            [experiment["id"] for experiment in response.data],
            [self.public_experiment.pk, self.second_public_experiment.pk],
        )


    def test_search_returns_empty_list_when_no_experiments_match(self):

        response = self.client.get(self.url, {"search": "Banana"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])