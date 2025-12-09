import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, SwatchIcon } from '@heroicons/react/24/outline';
import styles from './ColorPickerModal.module.css';

/**
 * ColorPickerModal - A reusable color picker modal component
 * Minimal Soft Korean Style with pastel tones and large border radius
 * 
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Callback when modal is closed
 * @param {function} onApply - Callback with selected color when applied
 * @param {string} initialColor - Initial color in hex format (e.g., '#4caf50')
 */
const ColorPickerModal = ({ isOpen, onClose, onApply, initialColor = '#4caf50' }) => {
    const { t } = useTranslation();

    // Color state
    const [currentHue, setCurrentHue] = useState(120);
    const [saturation, setSaturation] = useState(0.8);
    const [brightness, setBrightness] = useState(0.8);
    const [customColor, setCustomColor] = useState(initialColor);

    // Convert HSV to RGB
    const hsvToRgb = useCallback((h, s, v) => {
        const c = v * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = v - c;

        let r, g, b;
        if (h < 60) { r = c; g = x; b = 0; }
        else if (h < 120) { r = x; g = c; b = 0; }
        else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; }
        else if (h < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }

        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }, []);

    // Convert RGB to hex
    const rgbToHex = useCallback((r, g, b) => {
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }, []);

    // Convert hex to HSV
    const hexToHsv = useCallback((hex) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const d = max - min;

        let h = 0;
        if (d !== 0) {
            if (max === r) h = ((g - b) / d) % 6;
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h = Math.round(h * 60);
            if (h < 0) h += 360;
        }

        const s = max === 0 ? 0 : d / max;
        const v = max;

        return { h, s, v };
    }, []);

    // Initialize from initialColor when modal opens
    useEffect(() => {
        if (isOpen && initialColor) {
            try {
                const hsv = hexToHsv(initialColor);
                setCurrentHue(hsv.h);
                setSaturation(hsv.s);
                setBrightness(hsv.v);
                setCustomColor(initialColor);
            } catch {
                // Fallback to default
            }
        }
    }, [isOpen, initialColor, hexToHsv]);

    // Update customColor when HSV changes
    useEffect(() => {
        const { r, g, b } = hsvToRgb(currentHue, saturation, brightness);
        setCustomColor(rgbToHex(r, g, b));
    }, [currentHue, saturation, brightness, hsvToRgb, rgbToHex]);

    // Generate gradient canvas for color square
    useEffect(() => {
        if (!isOpen) return;

        const gradientSquare = document.getElementById('color-picker-gradient-square');
        if (gradientSquare) {
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 160;
            const ctx = canvas.getContext('2d');

            for (let x = 0; x < 200; x++) {
                for (let y = 0; y < 160; y++) {
                    const sat = x / 200;
                    const bright = 1 - (y / 160);
                    const { r, g, b } = hsvToRgb(currentHue, sat, bright);
                    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                    ctx.fillRect(x, y, 1, 1);
                }
            }

            gradientSquare.style.backgroundImage = `url(${canvas.toDataURL()})`;
        }
    }, [isOpen, currentHue, hsvToRgb]);

    // Handle gradient square click/drag
    const handleGradientInteraction = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

        setSaturation(x / rect.width);
        setBrightness(1 - (y / rect.height));
    };

    // Handle hue slider click/drag
    const handleHueInteraction = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        setCurrentHue((x / rect.width) * 360);
    };

    // Handle RGB input change
    const handleRgbChange = (channel, value) => {
        const r = channel === 'r' ? (parseInt(value) || 0) : parseInt(customColor.slice(1, 3), 16);
        const g = channel === 'g' ? (parseInt(value) || 0) : parseInt(customColor.slice(3, 5), 16);
        const b = channel === 'b' ? (parseInt(value) || 0) : parseInt(customColor.slice(5, 7), 16);

        const clamp = (v) => Math.max(0, Math.min(255, v));
        const newColor = rgbToHex(clamp(r), clamp(g), clamp(b));

        const hsv = hexToHsv(newColor);
        setCurrentHue(hsv.h);
        setSaturation(hsv.s);
        setBrightness(hsv.v);
    };

    // Handle backdrop click
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Handle apply
    const handleApply = () => {
        onApply(customColor);
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className={styles['modal-overlay']} onClick={handleBackdropClick}>
            <div className={styles['modal-backdrop']} />
            <div className={styles['modal-container']}>
                {/* Header */}
                <div className={styles['modal-header']}>
                    <h3 className={styles['modal-title']}>
                        <SwatchIcon className={styles['title-icon']} />
                        {t('tourWizard.step2.colorPicker.title')}
                    </h3>
                    <button
                        className={styles['modal-close-btn']}
                        onClick={onClose}
                        type="button"
                    >
                        <XMarkIcon className={styles['close-icon']} />
                    </button>
                </div>

                {/* Body */}
                <div className={styles['modal-body']}>
                    {/* Color Gradient Area */}
                    <div className={styles['color-gradient-area']}>
                        <div
                            className={styles['color-gradient-square']}
                            id="color-picker-gradient-square"
                            onMouseDown={(e) => {
                                handleGradientInteraction(e);
                                const handleMove = (me) => handleGradientInteraction(me);
                                const handleUp = () => {
                                    document.removeEventListener('mousemove', handleMove);
                                    document.removeEventListener('mouseup', handleUp);
                                };
                                document.addEventListener('mousemove', handleMove);
                                document.addEventListener('mouseup', handleUp);
                            }}
                        >
                            <div
                                className={styles['color-selector']}
                                style={{
                                    left: `${saturation * 100}%`,
                                    top: `${(1 - brightness) * 100}%`,
                                    backgroundColor: customColor
                                }}
                            />
                        </div>

                        {/* Hue Slider */}
                        <div
                            className={styles['hue-slider']}
                            onMouseDown={(e) => {
                                handleHueInteraction(e);
                                const handleMove = (me) => handleHueInteraction(me);
                                const handleUp = () => {
                                    document.removeEventListener('mousemove', handleMove);
                                    document.removeEventListener('mouseup', handleUp);
                                };
                                document.addEventListener('mousemove', handleMove);
                                document.addEventListener('mouseup', handleUp);
                            }}
                        >
                            <div
                                className={styles['hue-selector']}
                                style={{
                                    left: `${(currentHue / 360) * 100}%`,
                                    backgroundColor: `hsl(${currentHue}, 100%, 50%)`
                                }}
                            />
                        </div>
                    </div>

                    {/* Color Preview */}
                    <div className={styles['color-preview-section']}>
                        <div
                            className={styles['color-swatch-large']}
                            style={{ backgroundColor: customColor }}
                        />
                        <span className={styles['color-hex-display']}>{customColor}</span>
                    </div>

                    {/* RGB Inputs */}
                    <div className={styles['rgb-inputs']}>
                        <div className={styles['rgb-input-group']}>
                            <label>R</label>
                            <input
                                type="number"
                                min="0"
                                max="255"
                                value={parseInt(customColor.slice(1, 3), 16)}
                                onChange={(e) => handleRgbChange('r', e.target.value)}
                                className={styles['rgb-input']}
                            />
                        </div>
                        <div className={styles['rgb-input-group']}>
                            <label>G</label>
                            <input
                                type="number"
                                min="0"
                                max="255"
                                value={parseInt(customColor.slice(3, 5), 16)}
                                onChange={(e) => handleRgbChange('g', e.target.value)}
                                className={styles['rgb-input']}
                            />
                        </div>
                        <div className={styles['rgb-input-group']}>
                            <label>B</label>
                            <input
                                type="number"
                                min="0"
                                max="255"
                                value={parseInt(customColor.slice(5, 7), 16)}
                                onChange={(e) => handleRgbChange('b', e.target.value)}
                                className={styles['rgb-input']}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className={styles['modal-footer']}>
                    <button
                        className={`${styles['footer-btn']} ${styles['btn-cancel']}`}
                        onClick={onClose}
                        type="button"
                    >
                        {t('tourWizard.step2.colorPicker.cancel')}
                    </button>
                    <button
                        className={`${styles['footer-btn']} ${styles['btn-apply']}`}
                        onClick={handleApply}
                        type="button"
                    >
                        {t('tourWizard.step2.colorPicker.apply')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ColorPickerModal;
