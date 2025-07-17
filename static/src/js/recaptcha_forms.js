odoo.define('website_recaptcha_v2.recaptcha_forms', function (require) {
'use strict';

var publicWidget = require('web.public.widget');

publicWidget.registry.RecaptchaForm = publicWidget.Widget.extend({
    selector: 'form:has(.g-recaptcha)',
    
    start: function () {
        console.log('RecaptchaForm widget starting for:', this.$el[0]);
        this._super.apply(this, arguments);
        this._loadRecaptcha();
    },
    
    _loadRecaptcha: function () {
        var self = this;
        
        // Debug: Log current state
        console.log('Loading reCAPTCHA for form:', this.$el[0]);
        console.log('Found .g-recaptcha elements:', this.$('.g-recaptcha').length);
        
        if (typeof grecaptcha !== 'undefined' && grecaptcha.render) {
            this._initRecaptcha();
        } else if (!window.recaptchaLoading) {
            window.recaptchaLoading = true;
            
            var script = document.createElement('script');
            script.src = 'https://www.google.com/recaptcha/api.js';
            script.onload = function() {
                setTimeout(function() {
                    self._initRecaptcha();
                }, 100);
            };
            script.onerror = function() {
                console.error('Failed to load reCAPTCHA script');
                window.recaptchaLoading = false;
            };
            document.head.appendChild(script);
        } else {
            // Script is already loading, wait for it
            var checkReady = function() {
                if (typeof grecaptcha !== 'undefined' && grecaptcha.render) {
                    self._initRecaptcha();
                } else {
                    setTimeout(checkReady, 100);
                }
            };
            setTimeout(checkReady, 100);
        }
    },
    
    _initRecaptcha: function () {
        var self = this;
        
        // Only initialize reCAPTCHA elements within THIS widget's form
        var recaptchaElements = this.$('.g-recaptcha');
        
        console.log('Initializing reCAPTCHA for', recaptchaElements.length, 'elements in form:', this.$el[0]);
        
        recaptchaElements.each(function(index, element) {
            console.log('Processing element:', element, 'widgetId:', element.dataset.widgetId);
            
            // Check if this element has already been initialized
            if (!element.dataset.widgetId && element.dataset.sitekey) {
                try {
                    console.log('Rendering reCAPTCHA for element:', element);
                    var widgetId = grecaptcha.render(element);
                    element.dataset.widgetId = widgetId;
                    console.log('Successfully rendered reCAPTCHA with widgetId:', widgetId);
                } catch (error) {
                    console.error('Error rendering reCAPTCHA:', error);
                }
            } else {
                console.log('Element already initialized or missing sitekey:', element);
            }
        });
    },
    
    destroy: function() {
        // Clean up reCAPTCHA widgets when destroying
        var recaptchaElements = this.$('.g-recaptcha');
        recaptchaElements.each(function(index, element) {
            if (element.dataset.widgetId && typeof grecaptcha !== 'undefined' && grecaptcha.reset) {
                try {
                    grecaptcha.reset(element.dataset.widgetId);
                    delete element.dataset.widgetId;
                } catch (error) {
                    console.error('Error resetting reCAPTCHA:', error);
                }
            }
        });
        
        this._super.apply(this, arguments);
    }
});

});