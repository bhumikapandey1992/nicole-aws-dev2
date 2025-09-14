// Calendar utilities for creating reminder events

export interface CalendarEvent {
  summary: string;
  description: string;
  start: string;
  end: string;
  url?: string;
}

export function createChallengeEndReminder(
  participantName: string,
  challengeName: string,
  campaignUrl?: string
): CalendarEvent {
  // Create reminder for 30 days from now
  const reminderDate = new Date();
  reminderDate.setDate(reminderDate.getDate() + 30);
  
  // Set time to 9 AM local time for the reminder
  reminderDate.setHours(9, 0, 0, 0);
  
  const startTime = reminderDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const endTime = new Date(reminderDate.getTime() + 60 * 60 * 1000) // 1 hour later
    .toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  return {
    summary: `Check ${challengeName} Challenge Progress`,
    description: `Reminder to check on ${participantName}'s ${challengeName} challenge progress and prepare for potential pledge fulfillment. ${campaignUrl ? `View campaign: ${campaignUrl}` : ''}`.trim(),
    start: startTime,
    end: endTime,
    url: campaignUrl
  };
}

export function generateICS(event: CalendarEvent): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  // Generate a unique UID for the event
  const uid = `challenge-reminder-${Date.now()}@brainfogrecoverysource.org`;
  
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Brain Fog Recovery Source//Metabolic Challenges//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${event.start}`,
    `DTEND:${event.end}`,
    `SUMMARY:${event.summary}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
  ];

  if (event.url) {
    icsContent.push(`URL:${event.url}`);
  }

  icsContent = icsContent.concat([
    'BEGIN:VALARM',
    'TRIGGER:-PT15M', // 15 minutes before
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: Check challenge progress',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ]);

  return icsContent.join('\r\n');
}

export function downloadICS(event: CalendarEvent, filename: string = 'challenge-reminder.ics'): void {
  try {
    // Validate input
    if (!event || !event.summary || !event.start || !event.end) {
      throw new Error('Invalid calendar event data');
    }

    // Check browser support
    if (!window.Blob || !window.URL || !window.URL.createObjectURL) {
      throw new Error('Browser does not support file downloads');
    }

    const icsContent = generateICS(event);
    if (!icsContent || icsContent.length < 50) {
      throw new Error('Failed to generate calendar content');
    }

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
    link.style.display = 'none';
    
    // Add to DOM, click, then remove
    document.body.appendChild(link);
    link.click();
    
    // Clean up after a brief delay to ensure download started
    setTimeout(() => {
      try {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        window.URL.revokeObjectURL(url);
      } catch (cleanupError) {
        console.warn('Cleanup error (non-critical):', cleanupError);
      }
    }, 100);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error');
    console.error('Error creating calendar file:', errorMessage);
    
    // Enhanced fallback system
    try {
      const icsContent = generateICS(event);
      
      // Try clipboard first if available
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(icsContent).then(() => {
          alert('Calendar event copied to clipboard! Paste it into a text file and save with .ics extension.');
        }).catch(() => {
          showCalendarFallback(icsContent, filename);
        });
      } else {
        showCalendarFallback(icsContent, filename);
      }
    } catch (fallbackError) {
      const fallbackErrorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError || 'Unknown error');
      console.error('Calendar fallback also failed:', fallbackErrorMessage);
      
      // Ultimate fallback
      alert('Unable to create calendar reminder. This may be due to browser security settings. Please try using a different browser or enable downloads.');
    }
  }
}

// Helper function for calendar fallback display
function showCalendarFallback(icsContent: string, filename: string): void {
  try {
    const newWindow = window.open('', '_blank', 'width=600,height=500,scrollbars=yes');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>Calendar Event - ${filename}</title>
            <style>
              body { font-family: system-ui, sans-serif; margin: 20px; }
              .content { background: #f8f9fa; padding: 15px; border: 1px solid #dee2e6; border-radius: 5px; }
              .instructions { background: #d1ecf1; padding: 10px; border-radius: 5px; margin-bottom: 15px; }
              pre { white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 11px; }
              .copy-btn { background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
              .copy-btn:hover { background: #0056b3; }
            </style>
          </head>
          <body>
            <h2>📅 Calendar Event</h2>
            <div class="instructions">
              <strong>Instructions:</strong>
              <ol>
                <li>Copy the calendar data below</li>
                <li>Save it as a file named "${filename}" (make sure it ends with .ics)</li>
                <li>Import the file into your calendar app (Google Calendar, Outlook, Apple Calendar, etc.)</li>
              </ol>
            </div>
            <button class="copy-btn" onclick="copyContent()">📋 Copy Calendar Data</button>
            <div class="content">
              <pre id="calendar-content">${icsContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
            </div>
            <script>
              function copyContent() {
                const content = document.getElementById('calendar-content').textContent;
                navigator.clipboard.writeText(content).then(function() {
                  alert('Calendar data copied to clipboard!');
                }).catch(function() {
                  // Fallback selection method
                  const range = document.createRange();
                  range.selectNode(document.getElementById('calendar-content'));
                  window.getSelection().removeAllRanges();
                  window.getSelection().addRange(range);
                  alert('Calendar data selected. Press Ctrl+C (or Cmd+C) to copy.');
                });
              }
            </script>
          </body>
        </html>
      `);
      newWindow.document.close();
    } else {
      // Pop-up blocked fallback
      const textArea = document.createElement('textarea');
      textArea.value = icsContent;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        alert('Calendar event copied to clipboard! Paste it into a text file and save with .ics extension.');
      } catch {
        alert('Please manually copy this calendar data and save it as a .ics file:\n\n' + icsContent.substring(0, 500) + '...');
      } finally {
        document.body.removeChild(textArea);
      }
    }
  } catch (displayError) {
    console.error('Display fallback failed:', displayError);
    throw displayError; // Re-throw to trigger ultimate fallback
  }
}

// Helper function to format date for display
export function formatEventDate(isoString: string): string {
  try {
    const date = new Date(isoString.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z'));
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}
