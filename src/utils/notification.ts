type NotificationTarget = {
  title: string;
  message: string;
  user: string;
};

function sendNotification({ title, message, user }: NotificationTarget): void {
  const notification = new Notification(title, {
    icon: 'https://cdn-icons-png.flaticon.com/512/733/733585.png',
    body: `@${user}: ${message}`,
  });

  notification.onclick = () => {
    window.open(window.location.origin, '_blank');
    notification.close();
  };
}

export default function checkPageStatus(title: string, message: string, user: string): void {
  if (!('Notification' in window)) {
    console.error('Browser failed to display notifications.');
    return;
  }

  if (Notification.permission === 'granted') {
    sendNotification({ title, message, user });
    return;
  }

  if (Notification.permission !== 'denied') {
    void Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        sendNotification({ title, message, user });
      }
    });
  }
}
