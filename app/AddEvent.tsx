import React, { useEffect, useState } from 'react';

interface AddEventProps {
  eventListData: string[];
}

export const AddEvent: React.FC<AddEventProps> = ({ eventListData }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<string | null>(null);
  const [isApiLoaded, setIsApiLoaded] = useState(false);

  const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
  
  const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
  const SCOPES = "https://www.googleapis.com/auth/calendar";

  useEffect(() => {
    const loadGoogleApis = () => {
      // Dynamically load Google API scripts
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.async = true;
      gapiScript.defer = true;
      gapiScript.onload = () => {
        const gisScript = document.createElement('script');
        gisScript.src = 'https://accounts.google.com/gsi/client';
        gisScript.async = true;
        gisScript.defer = true;
        gisScript.onload = initializeGoogleApis;
        document.head.appendChild(gisScript);
      };
      document.head.appendChild(gapiScript);

      return () => {
        document.head.removeChild(gapiScript);
      };
    };

    const storedAccessToken = localStorage.getItem('access_token');
    const storedExpiresIn = localStorage.getItem('expires_in');
    
    setAccessToken(storedAccessToken);
    setExpiresIn(storedExpiresIn);

    loadGoogleApis();
  }, []);

  const initializeGoogleApis = () => {
    if ((window as any).gapi && (window as any).google) {
      (window as any).gapi.load('client', async () => {
        try {
          await (window as any).gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: [DISCOVERY_DOC],
          });

          setIsApiLoaded(true);

          if (accessToken && expiresIn) {
            (window as any).gapi.client.setToken({
              access_token: accessToken,
              expires_in: expiresIn,
            });
          }
        } catch (error) {
          console.error('Error initializing Google APIs:', error);
        }
      });
    } else {
      console.error('Google APIs not loaded');
    }
  };

  function handleAuthClick() {
    if (!isApiLoaded) {
      console.error('Google APIs not loaded');
      return;
    }

    const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: async (resp: any) => {
        if (resp.error) {
          throw resp;
        }
        await listUpcomingEvents();
        const { access_token, expires_in } = (window as any).gapi.client.getToken();
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('expires_in', expires_in);
        setAccessToken(access_token);
        setExpiresIn(expires_in);
      }
    });

    if (!(accessToken && expiresIn)) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  }

  function handleSignoutClick() {
    console.log("sign out happen")
    const token = (window as any).gapi.client.getToken();
    if (token !== null) {
      (window as any).google.accounts.oauth2.revoke(token.access_token);
      (window as any).gapi.client.setToken('');
      localStorage.clear();
      setAccessToken(null);
      setExpiresIn(null);
    }
  }

  async function listUpcomingEvents() {
    if (!isApiLoaded) {
      console.error('Google Calendar API not loaded');
      return;
    }

    try {
      const request = {
        'calendarId': 'primary',
        'timeMin': (new Date()).toISOString(),
        'showDeleted': false,
        'singleEvents': true,
        'maxResults': 10,
        'orderBy': 'startTime',
      };
      const response = await (window as any).gapi.client.calendar.events.list(request);
      const events = response.result.items;

      if (!events || events.length === 0) {
        console.log('No events found.');
        return;
      }
      
      const output = events.reduce(
        (str: string, event: any) => `${str}${event.summary} (${event.start.dateTime || event.start.date})\n`,
        'Events:\n'
      );
      console.log(output);
    } catch (err: any) {
      console.error('Error listing events:', err.message);
    }
  }
  
  // async function addManualEvent() {
  //   if (!isApiLoaded) {
  //     console.error('Google Calendar API not loaded');
  //     return;
  //   }

  //   const event = {
  //     'kind': 'calendar#event',
  //     'summary': 'Event 3',
  //     'location': 'Masai School, Bangalore',
  //     'description': `https://www.youtube.com/watch?v=6VbETTS67rM`,
  //     'start': {
  //       'dateTime': '2024-10-18T01:05:00.000Z',
  //       'timeZone': 'UTC'
  //     },
  //     'end': {
  //       'dateTime': '2024-10-19T01:35:00.000Z',
  //       'timeZone': 'UTC'
  //     },
  //     'recurrence': [
  //       'RRULE:FREQ=DAILY;COUNT=1'
  //     ],
  //     'attendees': [
  //       {'email': 'techmovadd@gmail.com','responseStatus':'needsAction'},
  //     ],
  //     'reminders': {
  //       'useDefault': true,
  //     },
  //     "guestsCanSeeOtherGuests": true,
  //   };

  //   try {
  //     const response = await (window as any).gapi.client.calendar.events.insert({
  //       'calendarId': 'primary',
  //       'resource': event,
  //       'sendUpdates': 'all'
  //     });

  //     console.log('Event added:', response);
  //     window.open(response.result.htmlLink);
  //   } catch (error) {
  //     console.error('Error adding event:', error);
  //   }
  // }

  async function addMultipleEvents() {
    if (!isApiLoaded) {
      console.error('Google Calendar API not loaded');
      return;
    }

    try {
      for (let i = 0; i < eventListData.length; i++) {
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + i);

        const event = {
          'kind': 'calendar#event',
          'summary': `Day ${i + 1}`,
          'location': 'Offline',
          'description': eventListData[i],
          'start': {
            'dateTime': eventDate.toISOString(),
            'timeZone': 'UTC'
          },
          'end': {
            'dateTime': eventDate.toISOString(),
            'timeZone': 'UTC'
          },
          'reminders': {
            'useDefault': true,
          },
          "guestsCanSeeOtherGuests": true,
        };

        const response = await (window as any).gapi.client.calendar.events.insert({
          'calendarId': 'primary',
          'resource': event,
          'sendUpdates': 'all'
        });

        console.log(`Event ${i + 1} added:`, response);
      }
    } catch (error) {
      console.error('Error adding events:', error);
    }
  }

  return (
    <div className='flex justify-end gap-3 mt-2 mb-2'>
      <button 
        id="authorize_button" 
        className='bg-black text-white px-3 py-1 rounded-full'
        disabled={!isApiLoaded}
        hidden={!!accessToken && !!expiresIn} 
        onClick={handleAuthClick}
      >
        Authorize
      </button>
      <button 
        id="signout_button" 
        className='bg-black text-white px-3 py-2 rounded-md'
        disabled={!isApiLoaded}
        hidden={!accessToken || !expiresIn}   
        onClick={handleSignoutClick}
      >
        Sign Out
      </button>
      <button 
        id='add_manual_event' 
        className='bg-black text-white px-3 py-2 rounded-md text-md'
        disabled={!isApiLoaded}
        hidden={!accessToken || !expiresIn} 
        onClick={addMultipleEvents}
      >
        Add Event
      </button>
    </div>
  );
};