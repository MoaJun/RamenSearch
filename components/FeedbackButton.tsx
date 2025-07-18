
import React from 'react';
import { Megaphone } from 'lucide-react';

interface FeedbackButtonProps {
    onOpen: () => void;
}

const FeedbackButton: React.FC<FeedbackButtonProps> = ({ onOpen }) => {
    return (
        <button
            onClick={onOpen}
            className="fixed bottom-5 right-5 z-50 flex items-center justify-center w-14 h-14 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-gray-900"
            aria-label="フィードバックを送信"
        >
            <Megaphone className="w-7 h-7" />
        </button>
    );
};

export default FeedbackButton;
