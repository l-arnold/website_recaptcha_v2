import logging

from odoo import http
from odoo.http import request
from odoo.addons.auth_signup.controllers.main import AuthSignupHome
from odoo.addons.web.controllers.main import Home
from odoo.addons.website_sale.controllers.main import WebsiteSale
from odoo.addons.portal.controllers.portal import CustomerPortal

_logger = logging.getLogger(__name__)


def _check_recaptcha():
    """
    Shared helper. Returns (is_valid, error_message).
    Always returns (True, '') if reCAPTCHA is disabled for this website.
    """
    website = request.website
    if not website or not website.recaptcha_v2_enabled:
        return True, ""
    recaptcha_response = request.params.get("g-recaptcha-response", "")
    is_valid = website._validate_recaptcha(recaptcha_response)
    if not is_valid:
        return False, "reCAPTCHA verification failed. Please try again."
    return True, ""


class RecaptchaHome(Home):
    """Adds server-side reCAPTCHA v2 check to /web/login."""

    @http.route("/web/login", type="http", auth="none", website=True)
    def web_login(self, redirect=None, **kw):
        if request.httprequest.method == "POST":
            is_valid, error = _check_recaptcha()
            if not is_valid:
                values = request.params.copy()
                values["error"] = error
                return request.render("web.login", values)
        return super().web_login(redirect, **kw)


class RecaptchaAuthSignup(AuthSignupHome):
    """Adds server-side reCAPTCHA v2 check to /web/signup and /web/reset_password."""

    @http.route("/web/signup", type="http", auth="public", website=True, sitemap=False)
    def web_auth_signup(self, *args, **kw):
        if request.httprequest.method == "POST":
            is_valid, error = _check_recaptcha()
            if not is_valid:
                qcontext = self.get_auth_signup_qcontext()
                qcontext["error"] = error
                return request.render("auth_signup.signup", qcontext)
        return super().web_auth_signup(*args, **kw)

    @http.route("/web/reset_password", type="http", auth="public", website=True, sitemap=False)
    def web_auth_reset_password(self, *args, **kw):
        if request.httprequest.method == "POST":
            is_valid, error = _check_recaptcha()
            if not is_valid:
                qcontext = self.get_auth_signup_qcontext()
                qcontext["error"] = error
                return request.render("auth_signup.reset_password", qcontext)
        return super().web_auth_reset_password(*args, **kw)


class RecaptchaCustomerPortal(CustomerPortal):
    """Adds server-side reCAPTCHA v2 check to portal account forms."""

    @http.route(["/my/account"], type="http", auth="user", website=True)
    def account(self, redirect=None, **post):
        if request.httprequest.method == "POST":
            is_valid, error = _check_recaptcha()
            if not is_valid:
                # Re-render with error - portal account page uses 'error' key
                values = self._prepare_portal_layout_values()
                values["error"] = {"recaptcha": error}
                values["error_message"] = [error]
                return request.render("portal.portal_my_details", values)
        return super().account(redirect=redirect, **post)


class RecaptchaWebsiteSale(WebsiteSale):
    """Adds server-side reCAPTCHA v2 check to checkout address step."""

    @http.route(
        ["/shop/checkout", "/shop/address"],
        type="http",
        auth="public",
        website=True,
        sitemap=False,
    )
    def checkout(self, **post):
        if request.httprequest.method == "POST":
            is_valid, error = _check_recaptcha()
            if not is_valid:
                # Re-render the address page with an error
                order = request.website.sale_get_order()
                values = self.checkout_values(**post)
                values["error"] = error
                return request.render("website_sale.address", values)
        return super().checkout(**post)
