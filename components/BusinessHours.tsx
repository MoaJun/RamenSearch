import React from 'react';
import { Clock } from 'lucide-react';

interface BusinessHoursProps {
  hours: string;
  isOpenNow: boolean;
}

const BusinessHours: React.FC<BusinessHoursProps> = ({ hours, isOpenNow }) => {

  const getCurrentStatus = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    // Parse opening hours (simplified - assumes same hours every day)
    const hoursMatch = hours.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (hoursMatch) {
      const openHour = parseInt(hoursMatch[1]);
      const openMinute = parseInt(hoursMatch[2]);
      const closeHour = parseInt(hoursMatch[3]);
      const closeMinute = parseInt(hoursMatch[4]);
      
      const openTime = openHour * 60 + openMinute;
      const closeTime = closeHour * 60 + closeMinute;
      
      if (isOpenNow && currentTime < closeTime) {
        const minutesUntilClose = closeTime - currentTime;
        const hoursUntilClose = Math.floor(minutesUntilClose / 60);
        const remainingMinutes = minutesUntilClose % 60;
        
        if (minutesUntilClose < 60) {
          return `あと${minutesUntilClose}分で閉店`;
        } else if (hoursUntilClose === 1 && remainingMinutes === 0) {
          return 'あと1時間で閉店';
        } else if (remainingMinutes === 0) {
          return `あと${hoursUntilClose}時間で閉店`;
        } else {
          return `あと${hoursUntilClose}時間${remainingMinutes}分で閉店`;
        }
      }
      
      if (!isOpenNow && currentTime < openTime) {
        const minutesUntilOpen = openTime - currentTime;
        const hoursUntilOpen = Math.floor(minutesUntilOpen / 60);
        const remainingMinutes = minutesUntilOpen % 60;
        
        if (minutesUntilOpen < 60) {
          return `あと${minutesUntilOpen}分で開店`;
        } else if (hoursUntilOpen === 1 && remainingMinutes === 0) {
          return 'あと1時間で開店';
        } else if (remainingMinutes === 0) {
          return `あと${hoursUntilOpen}時間で開店`;
        } else {
          return `あと${hoursUntilOpen}時間${remainingMinutes}分で開店`;
        }
      }
    }
    
    return null;
  };

  // Parse hours to highlight today's info
  const getTodayHighlight = () => {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const today = new Date().getDay();
    const todayJp = days[today];
    
    // Check if hours string contains day-specific information
    if (hours.includes('月曜日') || hours.includes('火曜日') || hours.includes('日曜日')) {
      const lines = hours.split('\n');
      const todayLine = lines.find(line => line.includes(`${todayJp}曜日`));
      if (todayLine) {
        return { todayJp, todayLine };
      }
    }
    return { todayJp, todayLine: null };
  };

  const statusMessage = getCurrentStatus();
  const { todayJp, todayLine } = getTodayHighlight();

  return (
    <div>
      <div className="flex items-start">
        <Clock className="h-4 w-4 mr-2 text-gray-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className={`inline-flex items-center text-sm font-semibold px-2 py-1 rounded-full ${
              isOpenNow ? 'bg-green-600 text-green-100' : 'bg-gray-600 text-gray-100'
            }`}>
              {isOpenNow ? '営業中' : '営業時間外'}
            </span>
            {statusMessage && (
              <span className="text-sm text-blue-400 font-medium">
                {statusMessage}
              </span>
            )}
            <span className="text-xs bg-blue-600 text-blue-100 px-2 py-1 rounded-full">
              {todayJp}曜日
            </span>
          </div>
          
          {/* Highlight today's hours if available */}
          {todayLine ? (
            <div className="space-y-1">
              <div className="text-blue-300 font-medium bg-blue-600/20 px-2 py-1 rounded text-sm">
                {todayLine}
              </div>
              {hours.split('\n').length > 1 && (
                <details className="text-gray-400 text-sm">
                  <summary className="cursor-pointer hover:text-gray-300">他の曜日を表示</summary>
                  <div className="mt-2 pl-4 space-y-1">
                    {hours.split('\n').filter(line => !line.includes(`${todayJp}曜日`)).map((line, index) => (
                      <div key={index} className="text-gray-400">{line}</div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ) : (
            <div className="text-gray-300 whitespace-pre-line">{hours}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(BusinessHours);