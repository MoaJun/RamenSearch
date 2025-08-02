
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Paperclip, Send, Image as ImageIcon, Loader2 } from 'lucide-react';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (feedbackData: { type: string; details: string; screenshot?: string }) => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [type, setType] = useState('suggestion');
    const [details, setDetails] = useState('');
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                setScreenshot(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const resetForm = useCallback(() => {
        setType('suggestion');
        setDetails('');
        setScreenshot(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!details.trim()) {
            alert('詳細を入力してください。');
            return;
        }

        setIsSubmitting(true);

        const feedbackData = {
            type,
            details,
            screenshot: screenshot || undefined,
        };

        try {
            // ローカルで動いているバックエンドサーバーのAPIを呼び出す
            const response = await fetch('http://localhost:8080/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(feedbackData),
            });

            if (!response.ok) {
                // バックエンドがエラーを返した場合
                throw new Error('Server responded with an error');
            }

            // 親コンポーネントのonSubmitを呼び出してトースト表示などをトリガー
            onSubmit(feedbackData);
            
            // フォームをリセットしてモーダルを閉じる
            onClose();

        } catch (error) {
            console.error('Failed to submit feedback:', error);
            alert('フィードバックの送信に失敗しました。後でもう一度お試しください。');
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);
    
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                resetForm();
                setIsSubmitting(false);
            }, 300); // Wait for closing animation
        }
    }, [isOpen, resetForm]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 transition-opacity animate-fade-in-fast"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-modal-title"
        >
            <div
                className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-md m-4 transform transition-transform animate-slide-in-bottom"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-800">
                    <h2 id="feedback-modal-title" className="text-xl font-bold text-white">フィードバックを送信</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">フィードバックの種類</label>
                            <div className="flex space-x-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="radio" name="feedbackType" value="suggestion" checked={type === 'suggestion'} onChange={(e) => setType(e.target.value)} className="form-radio h-4 w-4 text-red-500 bg-gray-800 border-gray-600 focus:ring-red-500"/>
                                    <span className="text-gray-200">ご意見・ご要望</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="radio" name="feedbackType" value="bug" checked={type === 'bug'} onChange={(e) => setType(e.target.value)} className="form-radio h-4 w-4 text-red-500 bg-gray-800 border-gray-600 focus:ring-red-500"/>
                                    <span className="text-gray-200">バグ報告</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="details" className="block text-sm font-medium text-gray-300 mb-2">詳細</label>
                            <textarea
                                id="details"
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                placeholder="改善点や問題点など、詳しくお聞かせください。"
                                className="w-full p-3 border border-gray-700 rounded-lg shadow-sm focus:ring-2 focus:ring-red-500 transition bg-gray-800 text-white min-h-[120px]"
                                required
                            ></textarea>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">スクリーンショット (任意)</label>
                            {screenshot ? (
                                <div className="relative group">
                                    <img src={screenshot} alt="Screenshot preview" className="rounded-lg max-h-40 w-auto" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setScreenshot(null);
                                            if(fileInputRef.current) fileInputRef.current.value = '';
                                        }}
                                        className="absolute top-2 right-2 bg-black bg-opacity-60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label="画像を削除"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-colors"
                                >
                                    <ImageIcon className="w-5 h-5" />
                                    <span>クリックして画像を選択</span>
                                </button>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/*"
                            />
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-800 flex justify-end">
                        <button
                            type="submit"
                            disabled={!details.trim() || isSubmitting}
                            className="flex items-center justify-center bg-red-600 text-white font-bold px-6 py-2.5 rounded-lg hover:bg-red-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed w-32"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-5 h-5 mr-2" />
                                    <span>送信する</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FeedbackModal;
