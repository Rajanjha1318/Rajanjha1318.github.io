document.addEventListener("DOMContentLoaded", () => {
    const applicationServerKey = "BMmJYAtoQKpCJivuw8T/yKhewzNWE265A9gy0uzYn821ds2726HKmDekQYQ8EqJAjqyP58lcw7wlEry8ASZVFI4=";
    let isPushEnabled = false;

  
push_subscribe();
    if (!('serviceWorker' in navigator)) {
        console.log("Service workers are not supported by this browser");
        changepushActionState('incompatible'); 
        return;
    }

    if (!('PushManager' in window)) {
       console.log('Push notifications are not supported by this browser');
        changepushActionState('incompatible');
        return;
    }

    if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
       console.log('Notifications are not supported by this browser');
        changepushActionState('incompatible');
        return;
    }

    // Check the current Notification permission.
    // If its denied, the button should appears as such, until the user changes the permission manually
    if (Notification.permission === 'denied') {
        console.log('Notifications are denied by the user');
        changepushActionState('incompatible');
        return;
    }

    navigator.serviceWorker.register("sw.js")
    .then(() => {
        console.log('[SW] Service worker has been registered');
        push_updateSubscription();
    }, e => {
        console.error('[SW] Service worker registration failed', e);
        changepushActionState('incompatible');
    });

    function changepushActionState (state) {
        switch (state) {
            case 'enabled':
               // pushAction.disabled = false;
				console.log('Disable Push notifications');
                isPushEnabled = true;
                break;
            case 'disabled':
               // pushAction.disabled = false;
				console.log('Enable Push notifications');
                isPushEnabled = false;
                break;
            case 'computing':
               // pushAction.disabled = true;
				console.log('Loading...');
                break;
            case 'incompatible':
               // pushAction.disabled = true;
				console.log('Push notifications are not compatible with this browser');
                break;
            default:
			console.log('Unhandled push button state');
                //console.error('Unhandled push button state', state);
                break;
        }
    }

    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    function push_subscribe() {
        changepushActionState('computing');

        navigator.serviceWorker.ready
        .then(serviceWorkerRegistration => serviceWorkerRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(applicationServerKey),
        }))
        .then(subscription => {
             // Subscription was successful
            // create subscription on your server
            return push_sendSubscriptionToServer(subscription, 'POST');
        })
        .then(subscription => subscription && changepushActionState('enabled')) // update your UI
        .catch(e => {
            if (Notification.permission === 'denied') {
                // The user denied the notification permission which
                // means we failed to subscribe and the user will need
                // to manually change the notification permission to
                // subscribe to push messages
                console.log('Notifications are denied by the user.');
                changepushActionState('incompatible');
            } else {
                // A problem occurred with the subscription; common reasons
                // include network errors or the user skipped the permission
                console.log('Impossible to subscribe to push notifications', e);
                changepushActionState('disabled');
            }
        });
    }

    function push_updateSubscription() {
        navigator.serviceWorker.ready.then(serviceWorkerRegistration => serviceWorkerRegistration.pushManager.getSubscription())
        .then(subscription => {
            changepushActionState('disabled');

            if (!subscription) {
                // We aren't subscribed to push, so set UI to allow the user to enable push
                return;
            }

            // Keep your server in sync with the latest endpoint
            return push_sendSubscriptionToServer(subscription, 'PUT');
        })
        .then(subscription => subscription && changepushActionState('enabled')) // Set your UI to show they have subscribed for push messages
        .catch(e => {
            //console.error('Error when updating the subscription', e);
        });
    }

    function push_unsubscribe() {
        changepushActionState('computing');

        // To unsubscribe from push messaging, you need to get the subscription object
        navigator.serviceWorker.ready
        .then(serviceWorkerRegistration => serviceWorkerRegistration.pushManager.getSubscription())
        .then(subscription => {
            // Check that we have a subscription to unsubscribe
            if (!subscription) {
                // No subscription object, so set the state
                // to allow the user to subscribe to push
                changepushActionState('disabled');
                return;
            }

            // We have a subscription, unsubscribe
            // Remove push subscription from server
            return push_sendSubscriptionToServer(subscription, 'DELETE');
        })
        .then(subscription => subscription.unsubscribe())
        .then(() => changepushActionState('disabled'))
        .catch(e => {
            // We failed to unsubscribe, this can lead to
            // an unusual state, so  it may be best to remove
            // the users data from your data store and
            // inform the user that you have done so
            //console.error('Error when unsubscribing the user', e);
            changepushActionState('disabled');
        });
    }

    function push_sendSubscriptionToServer(subscription, method) {	
        const key = subscription.getKey('p256dh');
        const token = subscription.getKey('auth');
        const contentEncoding = (PushManager.supportedContentEncodings || ['aesgcm'])[0];
		var base_url = "https://allapppress.com/"; 
		var post_data=JSON.stringify({
                pushval: "21489",
                endpoint: subscription.endpoint,
                publicKey: key ? btoa(String.fromCharCode.apply(null, new Uint8Array(key))) : null,
                authToken: token ? btoa(String.fromCharCode.apply(null, new Uint8Array(token))) : null,
                contentEncoding,
            }); 
			console.log(post_data);
		   return fetch(base_url+'users/pwa_push', {
            method,
            body: post_data,
        }).then(() => subscription);
    }

   
});