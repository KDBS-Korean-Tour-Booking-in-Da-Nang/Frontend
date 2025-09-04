import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './SearchSidebar.css';

const SearchSidebar = ({ onSearch, onHashtagFilter }) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [popularHashtags, setPopularHashtags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const timerRef = useRef(null);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [suggestPos, setSuggestPos] = useState({ left: 0, top: 0, width: 0 });

  useEffect(() => {
    fetchPopularHashtags();
  }, []);

  // Expose a refresh method to parent via global event
  useEffect(() => {
    const handler = () => fetchPopularHashtags();
    window.addEventListener('refresh-popular-hashtags', handler);
    return () => window.removeEventListener('refresh-popular-hashtags', handler);
  }, []);

  const fetchPopularHashtags = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/hashtags/popular?limit=8');
      if (response.ok) {
        const hashtags = await response.json();
        setPopularHashtags(hashtags.map(h => ({
          content: h.content,
          count: h.postCount || 0
        })));
      } else {
        // Fallback to mock data
        const mockHashtags = [
          { content: 'technology', count: 156 },
          { content: 'business', count: 89 },
          { content: 'startup', count: 67 },
          { content: 'innovation', count: 45 },
          { content: 'marketing', count: 34 },
          { content: 'finance', count: 28 },
          { content: 'design', count: 23 },
          { content: 'education', count: 19 }
        ];
        setPopularHashtags(mockHashtags);
      }
    } catch (error) {
      console.error('Error fetching popular hashtags:', error);
      // Fallback to mock data
      const mockHashtags = [
        { content: 'technology', count: 156 },
        { content: 'business', count: 89 },
        { content: 'startup', count: 67 },
        { content: 'innovation', count: 45 },
        { content: 'marketing', count: 34 },
        { content: 'finance', count: 28 },
        { content: 'design', count: 23 },
        { content: 'education', count: 19 }
      ];
      setPopularHashtags(mockHashtags);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchKeyword.trim()) {
      onSearch(searchKeyword.trim());
      setShowSuggest(false);
    }
  };

  const handleHashtagClick = (hashtag) => {
    onHashtagFilter([hashtag.content]);
  };

  const handleClearSearch = () => {
    setSearchKeyword('');
    onSearch('');
    setSuggestions([]);
    setShowSuggest(false);
  };

  // Debounced live suggestions
  useEffect(() => {
    if (!searchKeyword.trim()) {
      setSuggestions([]);
      setShowSuggest(false);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      fetchSuggestions(searchKeyword.trim());
    }, 300);
    return () => timerRef.current && clearTimeout(timerRef.current);
  }, [searchKeyword]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const onClick = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) {
        setShowSuggest(false);
      }
    };
    if (showSuggest) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showSuggest]);

  const fetchSuggestions = async (q) => {
    try {
      const url = `http://localhost:8080/api/posts/search?keyword=${encodeURIComponent(q)}&size=8&sort=createdAt,desc`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('suggest failed');
      const data = await res.json();
      const items = (data.content || []);
      // Build mixed suggestions: title, content, user, hashtags
      const result = [];
      items.forEach(p => {
        if (p.title) result.push({ type: 'title', text: p.title });
        if (p.content) result.push({ type: 'content', text: p.content.slice(0, 80) });
        if (p.username) result.push({ type: 'user', text: p.username });
        (p.hashtags || []).forEach(h => result.push({ type: 'hashtag', text: `#${h.content}` }));
      });
      // Deduplicate by text
      const seen = new Set();
      const dedup = [];
      for (const r of result) {
        if (!r.text) continue;
        const key = r.text.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        dedup.push(r);
      }
      setSuggestions(dedup.slice(0, 10));
      setShowSuggest(true);
    } catch (e) {
      setSuggestions([]);
      setShowSuggest(false);
    }
  };

  const clickSuggestion = (s) => {
    if (s.type === 'hashtag') {
      const tag = s.text.replace(/^#/, '');
      onHashtagFilter([tag]);
    } else if (s.type === 'user') {
      onSearch(s.text);
    } else {
      onSearch(s.text);
    }
    setShowSuggest(false);
  };

  // Position dropdown like YouTube (anchored to input, fixed on viewport)
  const updateDropdownPos = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setSuggestPos({ left: rect.left, top: rect.bottom + 6, width: rect.width });
  };
  useEffect(() => {
    updateDropdownPos();
    window.addEventListener('resize', updateDropdownPos);
    window.addEventListener('scroll', updateDropdownPos, true);
    return () => {
      window.removeEventListener('resize', updateDropdownPos);
      window.removeEventListener('scroll', updateDropdownPos, true);
    };
  }, []);

  return (
    <div className="search-sidebar" ref={rootRef}>
      <div className="search-section">
        <h3 className="sidebar-title">Tìm kiếm bài viết</h3>
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-container">
            <input
              type="text"
              placeholder="Tìm kiếm bài viết..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="search-input"
              onFocus={() => suggestions.length > 0 && setShowSuggest(true)}
              ref={inputRef}
            />
            <button type="submit" className="search-btn">
              🔍
            </button>
          </div>
          {showSuggest && suggestions.length > 0 && createPortal(
            <div className="search-suggest" style={{ position: 'fixed', left: suggestPos.left, top: suggestPos.top, width: suggestPos.width }}>
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`suggest-item ${s.type}`}
                  onClick={() => clickSuggestion(s)}
                >
                  <span className="icon">{s.type === 'hashtag' ? '#' : s.type === 'user' ? '👤' : '🔎'}</span>
                  <span className="text">{s.text}</span>
                </button>
              ))}
            </div>, document.body)
          }
          {searchKeyword && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="clear-search-btn"
            >
              Xóa tìm kiếm
            </button>
          )}
        </form>
      </div>

      <div className="hashtags-section">
        <h3 className="sidebar-title">Hashtags phổ biến</h3>
        <div className="hashtags-list">
          {popularHashtags.map((hashtag, index) => (
            <button
              key={index}
              onClick={() => handleHashtagClick(hashtag)}
              className="hashtag-item"
            >
              <span className="hashtag-text">#{hashtag.content}</span>
              <span className="hashtag-count">{hashtag.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="trending-section">
        <h3 className="sidebar-title">Xu hướng</h3>
        <div className="trending-topics">
          <div className="trending-topic">
            <span className="topic-number">1</span>
            <span className="topic-text">Công nghệ AI mới nhất</span>
          </div>
          <div className="trending-topic">
            <span className="topic-number">2</span>
            <span className="topic-text">Startup thành công</span>
          </div>
          <div className="trending-topic">
            <span className="topic-number">3</span>
            <span className="topic-text">Marketing số</span>
          </div>
          <div className="trending-topic">
            <span className="topic-number">4</span>
            <span className="topic-text">Đầu tư tài chính</span>
          </div>
          <div className="trending-topic">
            <span className="topic-number">5</span>
            <span className="topic-text">Thiết kế UX/UI</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchSidebar;
