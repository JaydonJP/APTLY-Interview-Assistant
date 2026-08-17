import pytest

from app.services.providers.base import TranscriptionRequest
from app.services.providers.whisperx_transcription import WhisperXTranscriptionProvider


@pytest.fixture
def whisperx_provider():
    return WhisperXTranscriptionProvider(
        model_size="base.en",
        device="cpu",
        compute_type="int8",
        vad_filter=False,
    )


def test_whisperx_initialization(whisperx_provider):
    assert whisperx_provider.model_size == "base.en"
    assert whisperx_provider.device == "cpu"
    assert whisperx_provider.compute_type == "int8"
    assert whisperx_provider.ffmpeg_path is not None


@pytest.mark.asyncio
async def test_whisperx_transcribe_empty_bytes(whisperx_provider):
    req = TranscriptionRequest(
        audio_bytes=b"",
        content_type="video/webm",
        language="en",
    )
    res = await whisperx_provider.transcribe(req)
    assert res.text == ""
    assert res.words == []
    assert res.duration_seconds == 0.0


@pytest.mark.asyncio
async def test_whisperx_transcribe_mocked_segments(monkeypatch, whisperx_provider):
    class MockWord:
        def __init__(self, word, start, end, probability):
            self.word = word
            self.start = start
            self.end = end
            self.probability = probability

    class MockSegment:
        def __init__(self, text, words):
            self.text = text
            self.words = words

    class MockInfo:
        def __init__(self):
            self.language = "en"
            self.duration = 4.5

    class MockModel:
        def transcribe(self, path, **kwargs):
            return [
                MockSegment(
                    "Basically I built a microservice with FastAPI",
                    [
                        MockWord("Basically", 0.2, 0.7, 0.95),
                        MockWord("I", 0.8, 0.9, 0.98),
                        MockWord("built", 1.0, 1.3, 0.99),
                        MockWord("a", 1.4, 1.5, 0.97),
                        MockWord("microservice", 1.6, 2.3, 0.96),
                        MockWord("with", 2.4, 2.6, 0.98),
                        MockWord("FastAPI", 2.7, 3.4, 0.94),
                    ],
                )
            ], MockInfo()

    monkeypatch.setattr(whisperx_provider, "_load_model", lambda: MockModel())
    monkeypatch.setattr(whisperx_provider, "_extract_audio_ffmpeg", lambda b: "dummy.wav")

    req = TranscriptionRequest(
        audio_bytes=b"DUMMY_WEBM_VIDEO_BINARY",
        content_type="video/webm",
        language="en",
    )
    res = await whisperx_provider.transcribe(req)

    assert res.text == "Basically I built a microservice with FastAPI"
    assert len(res.words) == 7
    assert res.words[0].word == "Basically"
    assert res.words[0].start_seconds == 0.2
    assert res.words[0].end_seconds == 0.7
    assert res.duration_seconds == 4.5
