// NotificationSystem.js - Simple notification utility

export class NotificationSystem {
  static showNotification(message, type = 'info', duration = 3000) {
    // Create notification element
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.padding = '10px 16px';
    notification.style.borderRadius = '4px';
    notification.style.fontSize = '14px';
    notification.style.zIndex = '9999';
    notification.style.transition = 'opacity 0.3s ease';
    notification.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    
    // Set colors based on notification type
    switch(type) {
      case 'success':
        notification.style.backgroundColor = 'rgba(0,128,0,0.8)';
        notification.style.color = 'white';
        break;
      case 'error':
        notification.style.backgroundColor = 'rgba(220,53,69,0.8)';
        notification.style.color = 'white';
        break;
      case 'warning':
        notification.style.backgroundColor = 'rgba(255,193,7,0.8)';
        notification.style.color = 'black';
        break;
      default: // info
        notification.style.backgroundColor = 'rgba(13,110,253,0.8)';
        notification.style.color = 'white';
    }
    
    // Add to document
    document.body.appendChild(notification);
    
    // Fade in
    setTimeout(() => {
      notification.style.opacity = '1';
    }, 10);
    
    // Remove after duration
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, duration);
    
    return notification;
  }
  
  static success(message, duration = 3000) {
    return this.showNotification(message, 'success', duration);
  }
  
  static error(message, duration = 4000) {
    return this.showNotification(message, 'error', duration);
  }
  
  static warning(message, duration = 3500) {
    return this.showNotification(message, 'warning', duration);
  }
  
  static info(message, duration = 3000) {
    return this.showNotification(message, 'info', duration);
  }
}