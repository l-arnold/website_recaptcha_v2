odoo.define('website_recaptcha_v2.recaptcha_forms', function (require) {
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
        
        // Check if reCAPTCHA is already loaded and ready
        if (typeof grecaptcha !== 'undefined' && grecaptcha.render) {
            this._initRecaptcha();
            return;
        }
        
        // If reCAPTCHA script is not loaded, load it
        if (!window.recaptchaScriptLoaded) {
            window.recaptchaScriptLoaded = true;
            
            // Create a global callback function that will be called when reCAPTCHA is ready
            window.onRecaptchaReady = function() {
                // Find all RecaptchaForm widgets and initialize them
                var widgets = publicWidget.registry.RecaptchaForm.prototype._getWidgets();
                widgets.forEach(function(widget) {
                    if (widget._initRecaptcha) {
                        widget._initRecaptcha();
                    }
                });
            };
            
            var script = document.createElement('script');
            script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaReady&render=explicit';
            script.async = true;
            script.defer = true;
            script.onerror = function() {
                console.error('Failed to load reCAPTCHA script');
            };
            document.head.appendChild(script);
        } else {
            // Script is loading, wait for the callback
            var checkReady = function() {
                if (typeof grecaptcha !== 'undefined' && grecaptcha.render) {
                    self._initRecaptcha();
                } else {
                    setTimeout(checkReady, 100);
                }
            };
            checkReady();
        }
    },
    
    _initRecaptcha: function () {
        var self = this;
        var recaptchaElements = this.$('.g-recaptcha');
        
        recaptchaElements.each(function(index, element) {
            // Check if this element has already been initialized
            if (!element.dataset.widgetId && element.dataset.sitekey) {
                try {
                    var widgetId = grecaptcha.render(element, {
                        'sitekey': element.dataset.sitekey,
                        'callback': function(response) {
                            // Optional: Handle successful reCAPTCHA completion
                            console.log('reCAPTCHA completed');
                        },
                        'expired-callback': function() {
                            // Optional: Handle reCAPTCHA expiration
                            console.log('reCAPTCHA expired');
                        }
                    });
                    element.dataset.widgetId = widgetId;
                } catch (error) {
                    console.error('Error rendering reCAPTCHA:', error);
                }
            }
        });
    },
    
    // Helper method to get all widget instances
    _getWidgets: function() {
        return publicWidget.registry.RecaptchaForm.prototype._instances || [];
    }
});

// Store widget instances for global callback
publicWidget.registry.RecaptchaForm.prototype._instances = [];

// Override the start method to track instances
var originalStart = publicWidget.registry.RecaptchaForm.prototype.start;
publicWidget.registry.RecaptchaForm.prototype.start = function() {
    publicWidget.registry.RecaptchaForm.prototype._instances.push(this);
    return originalStart.apply(this, arguments);
};

// Override the destroy method to clean up instances
var originalDestroy = publicWidget.registry.RecaptchaForm.prototype.destroy;
publicWidget.registry.RecaptchaForm.prototype.destroy = function() {
    var instances = publicWidget.registry.RecaptchaForm.prototype._instances;
    var index = instances.indexOf(this);
    if (index > -1) {
        instances.splice(index, 1);
    }
    return originalDestroy.apply(this, arguments);
};

});