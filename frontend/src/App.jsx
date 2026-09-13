import { useState, useRef } from 'react';
import * as htmlToImage from 'html-to-image';
import { RabbitIcon } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import QuickExamples from './QuickExamples';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [preview, setPreview] = useState(null);
  
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const cardRef = useRef(null);
  const inputRef = useRef(null);
  const requestCounter = useRef(0);

  const handleClear = () => {
    setUrl('');
    setPreview(null);
    setError(null);
    setExportError(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const getErrorMessage = (code, rawError) => {
    switch(code) {
      case 'INVALID_URL': return "Please enter a valid URL.";
      case 'SSRF_BLOCKED': return "For security reasons, fetching this internal or private URL is not allowed.";
      case 'TOO_MANY_REDIRECTS': return "The website redirected too many times.";
      case 'TIMEOUT': return "The website took too long to respond. Please try again later.";
      case 'HTTP_403_FORBIDDEN': return "The website blocked our request. It may have aggressive bot protection.";
      case 'HTTP_ERROR': return "The website returned an error. It might be down or unavailable.";
      case 'NETWORK_ERROR': return "We encountered a network error while trying to fetch the website.";
      default: return rawError || "An unexpected error occurred.";
    }
  };

  const handleSubmit = async (e, directUrl) => {
    if (e) e.preventDefault();
    let normalizedUrl = (typeof directUrl === 'string' ? directUrl : url).trim();
    if (!normalizedUrl) return;

    if (typeof directUrl === 'string') {
      setUrl(normalizedUrl);
    }

    if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    
    requestCounter.current += 1;
    const currentReqId = requestCounter.current;
    
    setLoading(true);
    setError(null);
    setPreview(null);
    setExportError(null);
    
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
      const response = await fetch(`${apiUrl}/api/fetch-html`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: normalizedUrl })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(getErrorMessage(data.code, data.error));
      }
      
      if (currentReqId !== requestCounter.current) {
        return;
      }
      
      setPreview({
        requestId: currentReqId,
        url: normalizedUrl,
        metadata: data.metadata,
        domain: data.metadata.siteName || data.metadata.domain || new URL(normalizedUrl).hostname
      });
      
    } catch (err) {
      if (currentReqId !== requestCounter.current) {
        return;
      }
      console.error(err);
      setError(err.message);
    } finally {
      if (currentReqId === requestCounter.current) {
        setLoading(false);
      }
    }
  };

  const handleExport = async () => {
    if (!cardRef.current || exporting || !preview) return;
    
    const exportReqId = requestCounter.current;
    
    setExporting(true);
    setExportError(null);
    
    try {
      const images = Array.from(cardRef.current.querySelectorAll('img'));
      await Promise.all(images.map(async img => {
        // Do NOT short-circuit on img.complete. img.complete can be true for the
        // *previous* image's pixels while a new src is still loading (race condition).
        // img.decode() always resolves only when the browser has fully decoded the
        // *current* src into pixels, making it the correct gate before capture.
        try {
          if (img.decode) await img.decode();
        } catch {
          // decode() rejects if src is broken — fall back to waiting for load/error
          if (!img.complete) {
            await new Promise(resolve => {
              img.onload = resolve;
              img.onerror = resolve;
            });
          }
        }
      }));
      
      if (exportReqId !== requestCounter.current) {
        setExportError("Preview changed during export. Please try again.");
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const dataUrl = await htmlToImage.toPng(cardRef.current, {
        cacheBust: true,
        includeQueryParams: true,  // prevents html-to-image's module-level cache from keying all proxy URLs to the same stripped path
        pixelRatio: 2,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });
      
      const link = document.createElement('a');
      const safeName = preview.domain.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      link.download = `${safeName}-og-preview.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error(e);
      setExportError("Could not export image.");
    } finally {
      if (exportReqId === requestCounter.current) {
        setExporting(false);
      }
    }
  };

  const renderPreview = () => {
    if (!preview && !loading) return null;

    if (loading) {
      return (
        <motion.div 
          key="skeleton"
          className="preview-wrapper"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="preview-container card-skeleton">
            <div className="skeleton-image"></div>
            <div className="skeleton-content">
              <div className="skeleton-domain"></div>
              <div className="skeleton-title"></div>
              <div className="skeleton-desc"></div>
              <div className="skeleton-desc short"></div>
            </div>
          </div>
        </motion.div>
      );
    }

    const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
    
    const imageUrl = preview.metadata?.image 
      ? `${apiUrl}/api/proxy-image?url=${encodeURIComponent(preview.metadata.image)}&previewId=${preview.requestId}` 
      : null;
      
    const faviconUrl = preview.metadata?.favicon 
      ? `${apiUrl}/api/proxy-image?url=${encodeURIComponent(preview.metadata.favicon)}&previewId=${preview.requestId}` 
      : null;

    return (
      <motion.div 
        key={`preview-${preview.requestId}`}
        className="preview-wrapper"
        initial={{ opacity: 0, y: 12, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="preview-section">
          <div className="preview-container" ref={cardRef}>
            <div className="preview-image-area">
              {imageUrl ? (
                <img 
                  key={`${preview.requestId}-${imageUrl}`}
                  src={imageUrl} 
                  alt={`OG image for ${preview.domain}`}
                  className="og-image" 
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="fallback-image">
                  <span className="fallback-domain">{preview.domain}</span>
                </div>
              )}
            </div>
            <div className="og-content-area">
              <div className="og-metadata-top">
                <div className="og-meta-left">
                  {faviconUrl ? (
                    <img 
                      key={`${preview.requestId}-${faviconUrl}`}
                      src={faviconUrl} 
                      alt="" 
                      className="og-favicon" 
                      crossOrigin="anonymous" 
                    />
                  ) : (
                    <div className="og-favicon-fallback">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                    </div>
                  )}
                  <span className="og-domain">{preview.domain}</span>
                </div>
                <a href={preview.url} target="_blank" rel="noopener noreferrer" className="og-external-link" aria-label="Open original link">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
                </a>
              </div>
              
              <h2 className={`og-title ${!preview.metadata.title ? 'is-fallback' : ''}`}>
                {preview.metadata.title || 'Title not provided'}
              </h2>
              <p className={`og-description ${!preview.metadata.description ? 'is-fallback' : ''}`}>
                {preview.metadata.description || 'This website did not provide a description for social previews.'}
              </p>
            </div>
          </div>

          <motion.div 
            className="card-actions-row"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <a href={preview.url} target="_blank" rel="noopener noreferrer" className="action-button secondary">
              View original
            </a>
            <div className="action-divider"></div>
            <button 
              className="action-button primary-action" 
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <span className="loading-spinner-small"></span>
              ) : (
                <svg className="action-icon-download" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              )}
              {exporting ? 'Exporting...' : 'Export as image'}
            </button>
          </motion.div>
          {exportError && (
            <div className="export-error-msg">
              {exportError}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="app-container">
      <motion.header 
        className="page-header"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="header-left">
          <span className="brand-mark">Open Graph</span>
        </div>
        <div className="header-tagline">
          SEE WHAT<br />YOUR LINKS SHARE.
        </div>
      </motion.header>
      
      <main className="main-content">
        <div className="hero-section">
          <h1 className="hero-title">
            <span className="hero-title-line">
              <motion.span 
                className="hero-title-inner"
                initial={{ y: "105%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                Paste a link
              </motion.span>
            </span>
            <span className="hero-title-line">
              <motion.span 
                className="hero-title-inner"
                initial={{ y: "105%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.75, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                See the <em>bigger picture</em>
              </motion.span>
            </span>
          </h1>
          <motion.p 
            className="hero-subtitle"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            Fetch Open Graph metadata and generate a beautiful preview
          </motion.p>
        </div>

        <motion.form 
          className="fetch-form" 
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.38, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="input-wrapper">
            <div className="input-field-container">
              <div className="input-icon">
                <RabbitIcon size={24} />
              </div>
              <input 
                ref={inputRef}
                type="text" 
                placeholder="https://github.com" 
                className="url-input"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className={`clear-button ${url ? 'visible' : ''}`}
                onClick={handleClear}
                tabIndex={url ? 0 : -1}
                aria-hidden={!url}
                aria-label="Clear input and preview"
                title="Clear"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <button type="submit" className="fetch-button" disabled={loading}>
              <span className="fetch-button-text">Preview</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>
          </div>
        </motion.form>

        <AnimatePresence mode="wait">
          {!preview && !loading && !error && (
            <QuickExamples 
              key="quick-examples"
              onSelect={(selectedUrl) => {
                handleSubmit(null, selectedUrl);
              }} 
            />
          )}

          {error && (
            <motion.div 
              key="error-box"
              className="error-message"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <p>{error}</p>
            </motion.div>
          )}

          {renderPreview()}
        </AnimatePresence>
      </main>

    </div>
  );
}

export default App;
