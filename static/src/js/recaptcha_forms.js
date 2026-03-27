/**
 * website_recaptcha_v2 - recaptcha_forms.js
 *
 * Odoo 14 public widget that:
 *   1. Loads the Google reCAPTCHA v2 API script once per page.
 *   2. Renders the widget into every .g-recaptcha div found inside a form.
 *   3. Disables the submit button (id="recaptcha_submit") until the user
 *      completes the challenge — matching the server-side enforcement.
 *   4. Re-disables on expiry so a stale token cannot be submitted.
 *
 * Works for both <button> and <a role="button"> submit elements.
 * The templates set disabled="disabled" on the submit button server-side.
 * This JS layer is defense-in-depth for browsers; server-side validation
 * in controllers/main.py is the authoritative check.
 */
odoo.define('website_recaptcha_v2.recaptcha_forms', function (require) {
    'use strict';

    var publicWidget = require('web.public.widget');

    // Track widget IDs keyed by form element so we can reset on expiry
    var formWidgetMap = {};

    /**
     * Disable a submit element — works for both <button> and <a> tags.
     */
    function disableSubmit($btn) {
        $btn.attr('disabled', 'disabled')
            .addClass('recaptcha-disabled')
            .css({
                'pointer-events': 'none',
                'opacity': '0.65',
                'cursor': 'not-allowed',
            });
    }

    /**
     * Enable a submit element — works for both <button> and <a> tags.
     */
    function enableSubmit($btn) {
        $btn.removeAttr('disabled')
            .removeClass('recaptcha-disabled')
            .css({
                'pointer-events': '',
                'opacity': '',
                'cursor': '',
            });
    }

    /**
     * Load the reCAPTCHA API script once per page.
     * Calls `callback` when grecaptcha is ready.
     */
    function loadRecaptchaScript(callback) {
        if (typeof grecaptcha !== 'undefined' && grecaptcha.render) {
            callback();
            return;
        }

        if (window._recaptchaScriptLoading) {
            // Already loading — poll until ready
            var interval = setInterval(function () {
                if (typeof grecaptcha !== 'undefined' && grecaptcha.render) {
                    clearInterval(interval);
                    callback();
                }
            }, 50);
            return;
        }

        window._recaptchaScriptLoading = true;
        var script = document.createElement('script');
        script.src = 'https://www.recaptcha.net/recaptcha/api.js?render=explicit&onload=_recaptchaOnLoad';
        script.async = true;
        script.defer = true;

        window._recaptchaOnLoad = function () {
            window._recaptchaScriptLoading = false;
            callback();
        };

        script.onerror = function () {
            window._recaptchaScriptLoading = false;
            console.error('[recaptcha_v2] Failed to load reCAPTCHA script.');
        };

        document.head.appendChild(script);
    }

    publicWidget.registry.RecaptchaForm = publicWidget.Widget.extend({
        // Match any form that contains a .g-recaptcha div
        selector: 'form:has(.g-recaptcha)',

        start: function () {
            this._super.apply(this, arguments);
            var self = this;

            var container = this.$('.g-recaptcha')[0];
            if (!container || !container.dataset.sitekey) {
                return;
            }

            // If the widget was already rendered (e.g. page cached), skip.
            if (container.dataset.widgetRendered) {
                return;
            }

            // Ensure submit button is disabled on page load
            var $submitBtn = this.$el.find('#recaptcha_submit');
            if ($submitBtn.length) {
                disableSubmit($submitBtn);
            }

            loadRecaptchaScript(function () {
                self._renderWidget(container);
            });
        },

        _renderWidget: function (container) {
            var self = this;
            var $form = this.$el;
            var $submitBtn = $form.find('#recaptcha_submit');

            try {
                var widgetId = grecaptcha.render(container, {
                    sitekey: container.dataset.sitekey,

                    callback: function (token) {
                        // Valid response — enable the submit button
                        enableSubmit($submitBtn);
                    },

                    'expired-callback': function () {
                        // Token expired — re-disable until user solves again
                        disableSubmit($submitBtn);
                    },

                    'error-callback': function () {
                        disableSubmit($submitBtn);
                        console.warn('[recaptcha_v2] reCAPTCHA error — check network and site key.');
                    },
                });

                container.dataset.widgetRendered = 'true';
                formWidgetMap[$form.attr('id') || $form.index()] = widgetId;

            } catch (e) {
                console.error('[recaptcha_v2] grecaptcha.render failed:', e);
            }
        },

        destroy: function () {
            var formKey = this.$el.attr('id') || this.$el.index();
            var widgetId = formWidgetMap[formKey];

            if (widgetId !== undefined && typeof grecaptcha !== 'undefined') {
                try {
                    grecaptcha.reset(widgetId);
                } catch (e) {
                    // Ignore reset errors on teardown
                }
                delete formWidgetMap[formKey];
            }

            var container = this.$('.g-recaptcha')[0];
            if (container) {
                delete container.dataset.widgetRendered;
            }

            this._super.apply(this, arguments);
        },
    });

});