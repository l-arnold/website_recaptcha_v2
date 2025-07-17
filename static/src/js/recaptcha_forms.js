odoo.define('website_recaptcha_v2.recaptcha_forms', function (require) {
'use strict';

var publicWidget = require('web.public.widget');

// Global tracking to prevent duplicate initializations
window.recaptchaInitialized = window.recaptchaInitialized || {};

publicWidget.registry.RecaptchaForm = publicWidget.Widget.extend({
    selector: 'form:has(.g-recaptcha)',
    
    start: function () {
        this._super.apply(this, arguments);
        
        // Add a unique identifier to this form to prevent duplicate processing
        if (!this.$el.attr('data-recaptcha-form-id')) {
            this.$el.attr('data-recaptcha-form-id', 'recaptcha_form_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
        }
        
        this._loadRecaptcha();
    },
    
    _loadRecaptcha: function () {
        var self = this;
        var formId = this.$el.attr('data-recaptcha-form-id');
        
        // Check if this form has already been processed
        if (window.recaptchaInitialized[formId]) {
            console.log('reCAPTCHA already initialized for form:', formId);
            return;
        }
        
        if (typeof grecaptcha !== 'undefined' && grecaptcha.render) {
            this._initRecaptcha();
        } else if (!window.recaptchaScriptLoading) {
            window.recaptchaScriptLoading = true;
            
            var script = document.createElement('script');
            script.src = 'https://www.google.com/recaptcha/api.js';
            script.onload = function() {
                // Wait for grecaptcha to be fully available
                var waitForGrecaptcha = function() {
                    if (typeof grecaptcha !== 'undefined' && grecaptcha.render) {
                        // Initialize all pending forms
                        $('form[data-recaptcha-form-id]').each(function() {
                            var $form = $(this);
                            var formId = $form.attr('data-recaptcha-form-id');
                            
                            if (!window.recaptchaInitialized[formId]) {
                                var widget = $form.data('widget');
                                if (widget && widget._initRecaptcha) {
                                    widget._initRecaptcha();
                                } else {
                                    // Fallback initialization
                                    self._initRecaptchaForForm($form);
                                }
                            }
                        });
                    } else {
                        setTimeout(waitForGrecaptcha, 50);
                    }
                };
                setTimeout(waitForGrecaptcha, 100);
            };
            script.onerror = function() {
                console.error('Failed to load reCAPTCHA script');
                window.recaptchaScriptLoading = false;
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
        
        // Store widget reference on the form element
        this.$el.data('widget', this);
    },
    
    _initRecaptcha: function () {
        var formId = this.$el.attr('data-recaptcha-form-id');
        
        // Check if already initialized
        if (window.recaptchaInitialized[formId]) {
            return;
        }
        
        this._initRecaptchaForForm(this.$el);
    },
    
    _initRecaptchaForForm: function($form) {
        var formId = $form.attr('data-recaptcha-form-id');
        
        if (window.recaptchaInitialized[formId]) {
            return;
        }
        
        var recaptchaElements = $form.find('.g-recaptcha');
        
        recaptchaElements.each(function(index, element) {
            // Skip if already has a widget ID
            if (element.dataset.widgetId) {
                return;
            }
            
            // Skip if no sitekey
            if (!element.dataset.sitekey) {
                console.error('reCAPTCHA element missing data-sitekey attribute');
                return;
            }
            
            try {
                var widgetId = grecaptcha.render(element, {
                    'sitekey': element.dataset.sitekey,
                    'callback': function(response) {
                        // Store response in a hidden input or handle as needed
                        console.log('reCAPTCHA completed for form:', formId);
                    },
                    'expired-callback': function() {
                        console.log('reCAPTCHA expired for form:', formId);
                    }
                });
                
                element.dataset.widgetId = widgetId;
                console.log('Successfully rendered reCAPTCHA with widgetId:', widgetId, 'for form:', formId);
                
            } catch (error) {
                console.error('Error rendering reCAPTCHA:', error);
            }
        });
        
        // Mark this form as initialized
        window.recaptchaInitialized[formId] = true;
    },
    
    destroy: function() {
        var formId = this.$el.attr('data-recaptcha-form-id');
        
        // Clean up reCAPTCHA widgets
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
        
        // Remove from initialized tracking
        if (formId && window.recaptchaInitialized[formId]) {
            delete window.recaptchaInitialized[formId];
        }
        
        this._super.apply(this, arguments);
    }
});

});