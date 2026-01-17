import speech_recognition as sr
from pydub import AudioSegment
from pydub.silence import split_on_silence

r = sr.Recognizer()

def transcribe_chunk(chunk):
    samples = chunk.get_array_of_samples()
    audio = sr.AudioData(
        bytes(samples),
        sample_rate=chunk.frame_rate,
        sample_width=chunk.sample_width
    )

    try:
        return r.recognize_google(audio)
    except (sr.UnknownValueError, sr.RequestError):
        return None


def audio_to_text(path,
                  mode="silence",
                  min_silence_len=500,
                  silence_offset=14,
                  keep_silence=500,
                  fixed_minutes=1):
    """
    Convert audio file → structured transcription
    Returns a list of dicts with timestamps + text
    """

    sound = AudioSegment.from_file(path)
    segments = []

    if mode == "silence":
        silence_thresh = sound.dBFS - silence_offset
        chunks = split_on_silence(
            sound,
            min_silence_len=min_silence_len,
            silence_thresh=silence_thresh,
            keep_silence=keep_silence
        )
    else:
        chunk_len = int(fixed_minutes * 60 * 1000)
        chunks = [
            sound[i:i + chunk_len]
            for i in range(0, len(sound), chunk_len)
        ]

    current_time = 0.0

    for chunk in chunks:
        duration = len(chunk) / 1000.0
        text = transcribe_chunk(chunk)

        segments.append({
            "start": round(current_time, 2),
            "end": round(current_time + duration, 2),
            "text": text
        })

        current_time += duration

    return segments
if __name__ == "__main__":
    segments = audio_to_text("16-122828-0002.wav") #change it later

    for s in segments:
        print(s)