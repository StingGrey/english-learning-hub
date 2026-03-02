"""RSS 内容清洗与提取测试"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services import rss_service


def test_clean_extracted_text_removes_markdown_links_and_urls():
    raw = "[Business](https://www.cnn.com/business) hello https://example.com/world"
    cleaned = rss_service._clean_extracted_text(raw)
    assert "Business" in cleaned
    assert "https://" not in cleaned


def test_looks_noisy_detects_ad_feedback_text():
    noisy = "CNN values your feedback. Did you encounter any technical issues?"
    assert rss_service._looks_noisy(noisy) is True


def test_extract_from_json_ld_article_body():
    html = '''
    <html><head>
      <script type="application/ld+json">
        {"@context": "https://schema.org", "@type": "NewsArticle", "articleBody": "This is real article body with enough words to pass the threshold and this sentence continues with more words to ensure extraction works properly in tests with enough context."}
      </script>
    </head></html>
    '''
    content = rss_service._extract_from_json_ld(html)
    assert "real article body" in content


def test_extract_from_best_text_blocks_filters_navigation_links():
    html = """
    <html><body>
      <nav><a href='/news'>News</a> <a href='/sport'>Sport</a></nav>
      <p><a href='/news'>News</a> * <a href='/sport'>Sport</a> * <a href='/business'>Business</a></p>
      <p>This is the first paragraph with enough words to be treated as article content.</p>
      <p>This is the second paragraph that should remain after filtering noisy link blocks.</p>
      <footer>BBC in other languages</footer>
    </body></html>
    """
    content = rss_service._extract_from_best_text_blocks(html)
    assert "first paragraph" in content
    assert "second paragraph" in content
    assert "News" not in content


def test_clean_extracted_text_removes_footer_noise_line():
    raw = "BBC in other languages\nThis is clean story paragraph with enough details."
    cleaned = rss_service._clean_extracted_text(raw)
    assert "BBC in other languages" not in cleaned
    assert "clean story paragraph" in cleaned
