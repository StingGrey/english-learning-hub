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
