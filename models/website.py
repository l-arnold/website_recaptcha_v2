# SPDX-FileCopyrightText: 2010-2014 Elico Corp
# SPDX-FileContributor: Augustin Cisterne-Kaas <augustin.cisterne-kaas@elico-corp.com>
# SPDX-FileCopyrightText: 2015 Tech-Receptives Solutions Pvt. Ltd.
# SPDX-FileCopyrightText: 2019 Coop IT Easy SC
# SPDX-FileCopyrightText: 2025 Nomadic, Inc.
#
# SPDX-License-Identifier: AGPL-3.0-or-later

import logging
import requests

from odoo import _, api, fields, models

_logger = logging.getLogger(__name__)

RECAPTCHA_API_URL = "https://www.recaptcha.net/recaptcha/api/siteverify"
RECAPTCHA_API_TIMEOUT = 30


class Website(models.Model):
    _inherit = "website"

    recaptcha_v2_enabled = fields.Boolean(
        string="Enable reCAPTCHA v2",
        default=False,
    )
    recaptcha_v2_site_key = fields.Char(
        string="reCAPTCHA v2 Site Key",
    )
    recaptcha_v2_secret_key = fields.Char(
        string="reCAPTCHA v2 Secret Key",
    )

    # NOTE: No @property aliases here. Templates must use the real field names:
    #   website.recaptcha_v2_enabled
    #   website.recaptcha_v2_site_key
    #   website.recaptcha_v2_secret_key
    # @property does NOT work reliably on Odoo model instances in QWeb context.

    @api.model
    def _get_error_message(self, errorcode=None):
        mapping = {
            "missing-input-secret": _("The secret parameter is missing."),
            "invalid-input-secret": _("The secret parameter is invalid or malformed."),
            "missing-input-response": _("The response parameter is missing."),
            "invalid-input-response": _(
                "The response parameter is invalid or malformed."
            ),
            "bad-request": _("The request is invalid or malformed."),
            "timeout-or-duplicate": _(
                "The response is no longer valid: either is too old or has "
                "been used previously."
            ),
        }
        return mapping.get(
            errorcode,
            _(
                "Unknown reCAPTCHA error (error code: %(errorcode)s).",
                errorcode=errorcode,
            ),
        )

    def is_recaptcha_v2_valid(self, form_values):
        """
        Checks whether the reCAPTCHA v2 challenge has been correctly solved.

        form_values must be a dictionary containing the form values.

        Returns a (bool, str) tuple. The first element tells whether the
        CAPTCHA is valid or not. The second is the error message when
        applicable (or an empty string).

        If reCAPTCHA is disabled in the settings, this method behaves as if
        the CAPTCHA was correctly solved, but without doing any check.
        """
        if not self.recaptcha_v2_enabled:
            _logger.debug("reCAPTCHA v2 is disabled for website %s, skipping check.", self.id)
            return (True, "")

        if not self.recaptcha_v2_secret_key:
            _logger.warning(
                "reCAPTCHA v2 enabled but no secret key configured for website %s.", self.id
            )
            return (False, _("reCAPTCHA secret key is not configured for this website."))

        response = form_values.get("g-recaptcha-response")
        if not response:
            return (False, _("No reCAPTCHA response given."))

        post_data = {
            "secret": self.recaptcha_v2_secret_key,
            "response": response,
        }
        try:
            res = requests.post(
                RECAPTCHA_API_URL, data=post_data, timeout=RECAPTCHA_API_TIMEOUT
            ).json()
        except requests.exceptions.RequestException as e:
            _logger.error("reCAPTCHA API request failed: %s", e)
            return (False, _("Could not reach reCAPTCHA verification service."))

        error_msg = "\n".join(
            self._get_error_message(error) for error in res.get("error-codes", [])
        )
        if error_msg:
            _logger.warning("reCAPTCHA validation errors for website %s: %s", self.id, error_msg)
            return (False, error_msg)

        if not res.get("success"):
            return (False, _("The reCAPTCHA challenge was not successfully completed."))

        _logger.debug("reCAPTCHA v2 validation successful for website %s.", self.id)
        return (True, "")

    def _validate_recaptcha(self, recaptcha_response):
        """
        Convenience method called by controllers.
        Returns True if valid or if reCAPTCHA is disabled, False otherwise.
        """
        form_values = {"g-recaptcha-response": recaptcha_response}
        is_valid, error_msg = self.is_recaptcha_v2_valid(form_values)
        if not is_valid:
            _logger.warning(
                "reCAPTCHA validation failed for website %s: %s", self.id, error_msg
            )
        return is_valid
