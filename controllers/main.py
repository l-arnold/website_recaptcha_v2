from odoo import http
from odoo.http import request
from odoo.addons.portal.controllers.portal import CustomerPortal
from odoo.addons.auth_signup.controllers.main import AuthSignupHome
from odoo.addons.web.controllers.main import Home
from odoo.addons.website_sale.controllers.main import WebsiteSale

class RecaptchaCustomerPortal(CustomerPortal):
    
    def _validate_recaptcha(self):
        if not request.website.recaptcha_site_key:
            return True
        
        recaptcha_response = request.params.get('g-recaptcha-response')
        if not recaptcha_response:
            return False
            
        return request.website._validate_recaptcha(recaptcha_response)

class RecaptchaAuthSignup(AuthSignupHome):
    
    def _validate_recaptcha(self):
        if not request.website.recaptcha_v2_enabled:
            return True
        
        recaptcha_response = request.params.get('g-recaptcha-response')
        if not recaptcha_response:
            return False
            
        return request.website._validate_recaptcha(recaptcha_response)
    
    @http.route('/web/signup', type='http', auth='public', website=True, sitemap=False)
    def web_auth_signup(self, *args, **kw):
        if request.httprequest.method == 'POST':
            if not self._validate_recaptcha():
                qcontext = self.get_auth_signup_qcontext()
                qcontext['error'] = "reCAPTCHA verification failed. Please try again."
                return request.render('auth_signup.signup', qcontext)
        return super(RecaptchaAuthSignup, self).web_auth_signup(*args, **kw)

class RecaptchaHome(Home):
    
    def _validate_recaptcha(self):
        if not request.website.recaptcha_v2_enabled:
            return True
        
        recaptcha_response = request.params.get('g-recaptcha-response')
        if not recaptcha_response:
            return False
            
        return request.website._validate_recaptcha(recaptcha_response)
    
    @http.route('/web/login', type='http', auth="none", website=True)
    def web_login(self, redirect=None, **kw):
        if request.httprequest.method == 'POST':
            if not self._validate_recaptcha():
                values = request.params.copy()
                values['error'] = "reCAPTCHA verification failed. Please try again."
                return request.render('web.login', values)
        return super(RecaptchaHome, self).web_login(redirect, **kw)

# Similar extensions for other controllers...