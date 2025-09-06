import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import './SearchSidebar.css';

const SearchSidebar = ({ onSearch, onHashtagFilter, selectedHashtags: externalSelectedHashtags }) => {
  const { t } = useTranslation();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [popularHashtags, setPopularHashtags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const timerRef = useRef(null);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [suggestPos, setSuggestPos] = useState({ left: 0, top: 0, width: 0 });
  const isClickingSuggestion = useRef(false);
  const isUpdatingFromSuggestion = useRef(false);
  const dropdownRef = useRef(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [selectedHashtags, setSelectedHashtags] = useState([]);
  const isInternalUpdate = useRef(false);
  const pendingFilterUpdate = useRef(null);

  useEffect(() => {
    fetchPopularHashtags();
    loadSearchHistory();
    
    // Load saved search keyword
    const savedSearchKeyword = localStorage.getItem('forum-search-keyword');
    if (savedSearchKeyword) {
      setSearchKeyword(savedSearchKeyword);
    }
  }, []);

  // Sync with external selected hashtags (from forum.jsx)
  useEffect(() => {
    if (externalSelectedHashtags && !isInternalUpdate.current) {
      setSelectedHashtags(externalSelectedHashtags);
    }
    isInternalUpdate.current = false;
  }, [externalSelectedHashtags]);

  // Handle pending filter updates
  useEffect(() => {
    if (pendingFilterUpdate.current) {
      onHashtagFilter(pendingFilterUpdate.current);
      pendingFilterUpdate.current = null;
    }
  }, [selectedHashtags, onHashtagFilter]);

  const loadSearchHistory = () => {
    try {
      const history = localStorage.getItem('forum-search-history');
      if (history) {
        const parsedHistory = JSON.parse(history);
        setSearchHistory(parsedHistory);
      }
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };

  const saveSearchHistory = (keyword) => {
    if (!keyword || keyword.trim() === '') return;
    
    try {
      const trimmedKeyword = keyword.trim();
      const newHistory = [trimmedKeyword, ...searchHistory.filter(item => item !== trimmedKeyword)].slice(0, 10); // Keep only 10 recent searches
      setSearchHistory(newHistory);
      localStorage.setItem('forum-search-history', JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  };

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
      const keyword = searchKeyword.trim();
      onSearch(keyword);
      saveSearchHistory(keyword);
      setShowSuggest(false);
      setSelectedIndex(-1);
    }
  };

  const handleHashtagClick = (hashtag, event) => {
    event.preventDefault();
    event.stopPropagation();
    
    const hashtagContent = hashtag.content;
    
    // Toggle hashtag selection
    setSelectedHashtags(prev => {
      let newSelected;
      if (prev.includes(hashtagContent)) {
        // Remove if already selected
        newSelected = prev.filter(tag => tag !== hashtagContent);
      } else {
        // Add if not selected
        newSelected = [...prev, hashtagContent];
      }
      
      // Mark as internal update to prevent sync loop
      isInternalUpdate.current = true;
      
      // Store pending update to be applied in useEffect
      pendingFilterUpdate.current = newSelected;
      
      return newSelected;
    });
  };

  const handleClearSearch = () => {
    setSearchKeyword('');
    onSearch(''); // This will clear both search and hashtag filters
    setSuggestions([]);
    setShowSuggest(false);
    setSelectedIndex(-1);
  };

  const handleHistoryClick = (keyword, e) => {
    console.log('History clicked:', keyword);
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    // Set keyword in input
    setSearchKeyword(keyword);
    // Trigger search immediately
    onSearch(keyword);
    // Close dropdown completely
    setShowSuggest(false);
    setIsInputFocused(false);
    setSuggestions([]); // Clear suggestions to prevent re-display
    setSelectedIndex(-1); // Reset selected index
    // Keep input focused for better UX
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  const handleRemoveHistoryItem = (keyword, e) => {
    console.log('Remove clicked:', keyword);
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    const newHistory = searchHistory.filter(item => item !== keyword);
    setSearchHistory(newHistory);
    try {
      localStorage.setItem('forum-search-history', JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error updating search history:', error);
    }
  };

  const handleClearAllHistory = () => {
    setSearchHistory([]);
    try {
      localStorage.removeItem('forum-search-history');
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  };

  // Debounced live suggestions
  useEffect(() => {
    if (!searchKeyword.trim()) {
      setSuggestions([]);
      // Show history if input is focused and we have history
      if (isInputFocused && searchHistory.length > 0) {
        setShowSuggest(true);
      } else if (!isInputFocused || searchHistory.length === 0) {
        setShowSuggest(false);
        setSelectedIndex(-1);
      }
      return;
    }
    
    // Don't fetch suggestions if we're currently clicking a suggestion or updating from suggestion
    if (isClickingSuggestion.current || isUpdatingFromSuggestion.current) {
      return;
    }
    
    // If showSuggest is false (e.g., after clicking history), don't fetch suggestions
    if (!showSuggest) {
      return;
    }
    
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      fetchSuggestions(searchKeyword.trim());
    }, 300);
    return () => timerRef.current && clearTimeout(timerRef.current);
  }, [searchKeyword, searchHistory.length, isInputFocused, showSuggest]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const onClick = (e) => {
      if (!rootRef.current) return;
      // Check if click is outside the entire search component AND dropdown
      const isOutsideRoot = !rootRef.current.contains(e.target);
      const isOutsideDropdown = !dropdownRef.current || !dropdownRef.current.contains(e.target);
      
      if (isOutsideRoot && isOutsideDropdown) {
        setShowSuggest(false);
        setSelectedIndex(-1);
        setIsInputFocused(false);
      }
    };
    if (showSuggest) {
      // Add a small delay to prevent immediate closing
      setTimeout(() => {
        document.addEventListener('click', onClick);
      }, 100);
    }
    return () => document.removeEventListener('click', onClick);
  }, [showSuggest]);


  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggest || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          clickSuggestion(suggestions[selectedIndex], e);
        } else if (searchKeyword.trim()) {
          onSearch(searchKeyword.trim());
          setShowSuggest(false);
          setSelectedIndex(-1);
        }
        break;
      case 'Escape':
        setShowSuggest(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const fetchSuggestions = async (q) => {
    try {
      // Fetch both posts and hashtags suggestions in parallel
      const [postsRes, hashtagsRes] = await Promise.all([
        fetch(`http://localhost:8080/api/posts/search?keyword=${encodeURIComponent(q)}&size=5&sort=createdAt,desc`),
        fetch(`http://localhost:8080/api/hashtags/search?keyword=${encodeURIComponent(q)}&limit=5`)
      ]);

      const result = [];

      // Process posts suggestions
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        const posts = postsData.content || [];
        console.log('Fetched posts for suggestions:', posts); // Debug log
        
        posts.forEach(p => {
          // Add post titles
          if (p.title && p.title.toLowerCase().includes(q.toLowerCase())) {
            result.push({ 
              type: 'post', 
              text: p.title, 
              subtitle: `${t('forum.search.by')} ${p.username}`,
              postId: p.forumPostId,
              icon: '📝'
            });
          }
          
          // Add usernames
          if (p.username && p.username.toLowerCase().includes(q.toLowerCase())) {
            result.push({ 
              type: 'user', 
              text: p.username, 
              subtitle: t('forum.search.user'),
              icon: '👤'
            });
          }
        });
      } else {
        console.log('Posts API failed:', postsRes.status, postsRes.statusText); // Debug log
      }

      // Process hashtags suggestions
      if (hashtagsRes.ok) {
        const hashtags = await hashtagsRes.json();
        hashtags.forEach(h => {
          result.push({ 
            type: 'hashtag', 
            text: `#${h.content}`, 
            subtitle: `${h.postCount || 0} ${t('forum.search.posts')}`,
            hashtag: h.content,
            icon: '#'
          });
        });
      }

      // Add trending topics if query is short
      if (q.length <= 2) {
        const trendingTopics = [
          { type: 'trending', text: 'Công nghệ AI mới nhất', icon: '🔥' },
          { type: 'trending', text: 'Startup thành công', icon: '🚀' },
          { type: 'trending', text: 'Marketing số', icon: '📈' },
          { type: 'trending', text: 'Đầu tư tài chính', icon: '💰' }
        ];
        result.push(...trendingTopics);
      }

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

      console.log('Final suggestions:', dedup.slice(0, 8)); // Debug log
      setSuggestions(dedup.slice(0, 8));
      setShowSuggest(true);
      setSelectedIndex(-1);
    } catch (e) {
      console.error('Error fetching suggestions:', e);
      setSuggestions([]);
      setShowSuggest(false);
    }
  };

  const clickSuggestion = (s, e) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    console.log('Clicking suggestion:', s); // Debug log
    
    // Close suggestions immediately to prevent re-opening
    setShowSuggest(false);
    setSelectedIndex(-1);
    setSuggestions([]); // Clear suggestions to prevent re-fetching
    setIsInputFocused(false); // Also close input focus state
    
    // Perform the appropriate action
    if (s.type === 'hashtag') {
      const tag = s.hashtag || s.text.replace(/^#/, '');
      console.log('Filtering by hashtag:', tag); // Debug log
      onHashtagFilter([tag]);
      // Don't clear search input - let the parent handle the mode switching
    } else {
      // For all other types (user, post, trending), perform search
      console.log('Searching for:', s.text); // Debug log
      console.log('Calling onSearch with:', s.text); // Debug log
      onSearch(s.text);
      console.log('Setting search keyword to:', s.text); // Debug log
      
      // Set flag to prevent re-fetching suggestions
      isUpdatingFromSuggestion.current = true;
      setSearchKeyword(s.text); // Update the search keyword in the input
      
      // Reset flag after a short delay
      setTimeout(() => {
        isUpdatingFromSuggestion.current = false;
      }, 500);
    }
    
    // No need to reset isClickingSuggestion flag since we're not using it anymore
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
        <h3 className="sidebar-title">{t('forum.search.title')}</h3>
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-container">
            <input
              type="text"
              placeholder={t('forum.search.placeholder')}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="search-input"
              onFocus={() => {
                setIsInputFocused(true);
                if (searchHistory.length > 0 && !searchKeyword.trim()) {
                  setShowSuggest(true);
                }
              }}
              onBlur={() => {
                setIsInputFocused(false);
              }}
              ref={inputRef}
            />
            <button type="submit" className="search-btn">
              🔍
            </button>
          </div>
          {showSuggest && (suggestions.length > 0 || (searchHistory.length > 0 && !searchKeyword.trim())) && createPortal(
            <div ref={dropdownRef} className="search-suggest" style={{ position: 'fixed', left: suggestPos.left, top: suggestPos.top, width: suggestPos.width }}>
              {suggestions.length > 0 ? (
                // Show suggestions when typing
                suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`suggest-item ${s.type} ${selectedIndex === idx ? 'selected' : ''}`}
                    onClick={(e) => clickSuggestion(s, e)}
                  >
                    <span className="icon">{s.icon || (s.type === 'hashtag' ? '#' : s.type === 'user' ? '👤' : '🔎')}</span>
                    <div className="suggest-content">
                      <span className="text">{s.text}</span>
                      {s.subtitle && <span className="subtitle">{s.subtitle}</span>}
                    </div>
                  </button>
                ))
              ) : (
                // Show search history when focused and no suggestions
                searchHistory.length > 0 && (
                  <>
                    <div className="history-header">
                      <span className="history-title">{t('forum.search.recentSearches')}</span>
                      <button
                        type="button"
                        onClick={handleClearAllHistory}
                        className="clear-all-history-btn"
                        title={t('forum.search.clearRecent')}
                      >
                        ✕
                      </button>
                    </div>
                    {searchHistory.map((keyword, index) => (
                      <div
                        key={index}
                        className="history-item"
                        onMouseDown={(e) => {
                          console.log('History item mousedown:', keyword, e);
                          handleHistoryClick(keyword, e);
                        }}
                        title={`Click để tìm kiếm "${keyword}"`}
                      >
                        <span className="history-keyword">{keyword}</span>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            console.log('Remove button mousedown:', keyword, e);
                            handleRemoveHistoryItem(keyword, e);
                          }}
                          className="remove-history-btn"
                          title={t('forum.search.removeFromHistory')}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </>
                )
              )}
            </div>, document.body)
          }
        </form>
      </div>

      <div className="hashtags-section">
        <div className="hashtags-header">
          <h3 className="sidebar-title">{t('forum.search.popularHashtags')}</h3>
          {selectedHashtags.length > 0 && (
            <button 
              className="clear-hashtags-btn"
              onClick={() => {
                isInternalUpdate.current = true;
                setSelectedHashtags([]);
                pendingFilterUpdate.current = [];
              }}
              title={t('forum.filter.clearAll')}
            >
              ✕
            </button>
          )}
        </div>
        <div className="hashtags-list">
          {popularHashtags.map((hashtag, index) => {
            const isSelected = selectedHashtags.includes(hashtag.content);
            return (
              <button
                key={index}
                onClick={(e) => handleHashtagClick(hashtag, e)}
                className={`hashtag-item ${isSelected ? 'selected' : ''}`}
              >
                {isSelected && <span className="hashtag-check">✓</span>}
                <span className="hashtag-text">#{hashtag.content}</span>
                <span className="hashtag-count">{hashtag.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="trending-section">
        <h3 className="sidebar-title">{t('forum.sidebar.trendingTopics')}</h3>
        <div className="trending-topics">
          <div className="trending-topic">
            <span className="topic-number">1</span>
            <span className="topic-text">{t('forum.trendingTopics.ai')}</span>
          </div>
          <div className="trending-topic">
            <span className="topic-number">2</span>
            <span className="topic-text">{t('forum.trendingTopics.startup')}</span>
          </div>
          <div className="trending-topic">
            <span className="topic-number">3</span>
            <span className="topic-text">{t('forum.trendingTopics.marketing')}</span>
          </div>
          <div className="trending-topic">
            <span className="topic-number">4</span>
            <span className="topic-text">{t('forum.trendingTopics.finance')}</span>
          </div>
          <div className="trending-topic">
            <span className="topic-number">5</span>
            <span className="topic-text">{t('forum.trendingTopics.design')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchSidebar;
