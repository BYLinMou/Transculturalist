// Error Display Utility
// Provides unified error display functionality across the application

(function() {
  'use strict';

  // Configuration for error display styles
  const ERROR_STYLES = {
    inline: {
      containerClass: 'text-center py-8',
      messageClass: 'text-red-400 mb-4 text-lg font-medium',
      buttonClass: 'px-6 py-3 gold-gradient text-black font-bold rounded-lg hover:opacity-90 transition-opacity'
    },
    modal: {
      overlayClass: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50',
      modalClass: 'bg-gray-900 border border-gold-600 p-6 rounded-lg shadow-lg max-w-sm w-full mx-4',
      titleClass: 'text-xl font-bold text-gold-300 mb-4',
      messageClass: 'text-gray-300 mb-6',
      buttonClass: 'px-4 py-2 gold-gradient text-black font-bold rounded hover:opacity-90 transition-opacity'
    }
  };

  // Get translated text with fallback
  function getTranslatedText(key, fallback) {
    return window.i18next ? window.i18next.t(key) : fallback;
  }

  // Show inline error in a container
  function showInlineError(container, message, options = {}) {
    const {
      showRetry = true,
      retryText = getTranslatedText('retry', '重試'),
      retryAction = () => location.reload(),
      messageClass = ERROR_STYLES.inline.messageClass,
      buttonClass = ERROR_STYLES.inline.buttonClass,
      containerClass = ERROR_STYLES.inline.containerClass
    } = options;

    container.className = containerClass;
    container.innerHTML = `
      <p class="${messageClass}">${message}</p>
      ${showRetry ? `<button class="${buttonClass}" onclick="(${retryAction.toString()})()">${retryText}</button>` : ''}
    `;
  }

  // Show modal error dialog
  function showModalError(title, message, options = {}) {
    const {
      confirmText = getTranslatedText('confirm', '確定'),
      onConfirm = () => {},
      titleClass = ERROR_STYLES.modal.titleClass,
      messageClass = ERROR_STYLES.modal.messageClass,
      buttonClass = ERROR_STYLES.modal.buttonClass
    } = options;

    const modal = document.createElement('div');
    modal.className = ERROR_STYLES.modal.overlayClass;

    modal.innerHTML = `
      <div class="${ERROR_STYLES.modal.modalClass}">
        <h3 class="${titleClass}">${title}</h3>
        <p class="${messageClass}">${message}</p>
        <div class="flex justify-end">
          <button class="${buttonClass}" onclick="this.closest('.fixed').remove(); (${onConfirm.toString()})()">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  // Show alert error (fallback for simple cases)
  function showAlertError(message) {
    alert(message);
  }

  // Show loading state
  function showLoading(container, loadingText = getTranslatedText('loading', '載入中...')) {
    container.innerHTML = `
      <div class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400 mb-4"></div>
        <p class="text-gray-300">${loadingText}</p>
      </div>
    `;
  }

  // Hide loading state
  function hideLoading(container) {
    // This function can be extended to restore previous content if needed
  }

  // Export to global scope
  window.errorDisplay = {
    showInlineError,
    showModalError,
    showAlertError,
    showLoading,
    hideLoading,
    getTranslatedText
  };

})();