odoo.define('website_recaptcha_v2.forms', function (require) {
'use strict';

var publicWidget = require('web.public.widget');

publicWidget.registry.RecaptchaForm = publicWidget.Widget.extend({
    selector: 'form:has(.g-recaptcha)',
    
    start: function () {
        this._super.apply(this, arguments);
        this._loadRecaptcha();
    },

    _loadRecaptcha: function () {
        var self = this;
        if (typeof grecaptcha === 'undefined') {
            var script = document.createElement('script');
            script.src = 'https://www.google.com/recaptcha/api.js';
            script.onload = function() {
                self._initRecaptcha();
            };
            document.head.appendChild(script);
        } else {
            this._initRecaptcha();
        }
    },

    _initRecaptcha: function () {
        var recaptchaElement = this.$('.g-recaptcha')[0];
        if (recaptchaElement && !recaptchaElement.dataset.widgetId) {
            var widgetId = grecaptcha.render(recaptchaElement);
            recaptchaElement.dataset.widgetId = widgetId;
        }
    },
});

});