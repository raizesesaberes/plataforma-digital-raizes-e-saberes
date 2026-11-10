// Verified static files only. Private source/license records are not published.
const freeze = value => { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
export const assetRegistry = freeze({
  "schemaVersion": 1,
  "editorialRevision": "carla-editorial-2026-11-10-v1",
  "release": {
    "status": "approved",
    "approvalRef": "carla-local-p00-p14-20261110"
  },
  "licenses": [
    {
      "id": "commercial-voice-20261110",
      "provider": "ElevenLabs",
      "commercialUse": true,
      "status": "confirmed",
      "confirmedOn": "2026-11-10",
      "evidenceRef": "commercial-generation-20261110"
    }
  ],
  "assets": [
    {
      "clipId": "colorir.cachorro.welcome",
      "textSha256": "bd4ace2eb4462aa00f376d81e90ae65250cb4ec1bc633db1c71ee93e0da68afb",
      "bindings": [
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-cachorro-welcome.mp3",
      "sha256": "96559cf5830e4e62629084da0afd3553277434f3cd277a63da61ee4be21078e8",
      "bytes": 86736,
      "durationSeconds": 4.362,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "individual",
        "reference": "voice-pilot-20261110-p00",
        "sourceReference": "source-p00-001-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": true,
        "individualAuditoryQuality": "passed",
        "pilotReference": null,
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.cachorro.discovery_4_5",
      "textSha256": "e3dacfd5905d73c7962fb876221c9b41aa5635fe3405f153f8ebe2e0aae42475",
      "bindings": [
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-cachorro-discovery_4_5.mp3",
      "sha256": "0a531128bd17190a6a3367fe9fe6655409f2017c4ccf2ee88d2c60ef5527a5f9",
      "bytes": 163640,
      "durationSeconds": 9.169,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "individual",
        "reference": "voice-pilot-20261110-p00",
        "sourceReference": "source-p00-002-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": true,
        "individualAuditoryQuality": "passed",
        "pilotReference": null,
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.numero3.count_three",
      "textSha256": "616d1fc91b4e30ba02749eb466d0b6557d2015d95a1aa3f437e7cdba34a84206",
      "bindings": [
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-numero3-count_three.mp3",
      "sha256": "50f464fa966fbf4bbe052242f5614f276633db05da8013734cb94350c86165ff",
      "bytes": 112231,
      "durationSeconds": 5.956,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "individual",
        "reference": "voice-pilot-20261110-p00",
        "sourceReference": "source-p00-003-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": true,
        "individualAuditoryQuality": "passed",
        "pilotReference": null,
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "common.audio_unavailable",
      "textSha256": "2f0b642d4769c6ebc65ebddcc9c95b80be539f210ff3dc0c0011ebe20722ba97",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f",
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944",
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50",
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803",
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c",
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763",
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f",
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/common-audio_unavailable.mp3",
      "sha256": "0a93971edf95f3539c8f1bcfd79675c3eb16deaa27ed4ae6a15289adb76ebd27",
      "bytes": 119754,
      "durationSeconds": 6.426,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "individual",
        "reference": "voice-pilot-20261110-p00",
        "sourceReference": "source-p00-004-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": true,
        "individualAuditoryQuality": "passed",
        "pilotReference": null,
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "quiz-exemplo-pergunta",
      "textSha256": "1ff7f71e7bae6fa11fff7060f37959b81b5fe078c621ca433d9a703cbae3f276",
      "bindings": [
        "game:ed05-EF1-ciencias-variedades-quiz-01:quiz:012f1f76874dd36ba25a2680d08f52ca5d23dc6ee3a993a42f67814f6e34beb3"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/quiz-exemplo-pergunta.mp3",
      "sha256": "89d990b7fc453b14ef2fe3894ef5a439b0fb42506095a527f87ecc77a27f39dc",
      "bytes": 177433,
      "durationSeconds": 10.031,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "individual",
        "reference": "voice-pilot-20261110-p00",
        "sourceReference": "source-p00-005-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": true,
        "individualAuditoryQuality": "passed",
        "pilotReference": null,
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "word-search-exemplo-explicacao",
      "textSha256": "796731aba077e0cff0c72e74072afe1ea10aea29d89607f83a5fa2bb6a5ef6d8",
      "bindings": [
        "game:ed05-EM3-ciencias-variedades-word-search-01:word-search:cb48a6d90363d49ac80272f73f7d09317d2c9dc5ba49e1d7061981bc2e0e09f6"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/word-search-exemplo-explicacao.mp3",
      "sha256": "b4e61218a9628cda1b94676a396d8da033324da69117b02a59edf9130e4f869a",
      "bytes": 272310,
      "durationSeconds": 15.961,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "individual",
        "reference": "voice-pilot-20261110-p00",
        "sourceReference": "source-p00-006-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": true,
        "individualAuditoryQuality": "passed",
        "pilotReference": null,
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "common.paint_touch",
      "textSha256": "5283cc215c7f7f3fbf81936793e2800b82597916aca7a142d139af90e481c217",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f",
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944",
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50",
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803",
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c",
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763",
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f",
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/common-paint_touch.mp3",
      "sha256": "1e447f0e1b1535029f311b993f980a0462f493dc34d86cd20ea5ca30686399a4",
      "bytes": 133965,
      "durationSeconds": 7.314,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p01-20261110",
        "sourceReference": "source-p01-001-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "common.paint_more_colors",
      "textSha256": "3cfd01321844067ae86fa5749b875cdf3abefc2d4c3c7962558852bf3693a415",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f",
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944",
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50",
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803",
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c",
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763",
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f",
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/common-paint_more_colors.mp3",
      "sha256": "2976dddb46f1687b19f90a0c62618d358e21c6f6282e21b12a851ad3ba23f4c2",
      "bytes": 93005,
      "durationSeconds": 4.754,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p01-20261110",
        "sourceReference": "source-p01-002-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "common.paint_brush",
      "textSha256": "c299895a5fb1b578bb462d155d851eb22a69af1e50d4769faa1b68f3009e88c1",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f",
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944",
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50",
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803",
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c",
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763",
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f",
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/common-paint_brush.mp3",
      "sha256": "502365979aad3a25f856a66d931fa82bd664e7d374009a2dde0da10d39343612",
      "bytes": 149430,
      "durationSeconds": 8.281,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p01-20261110",
        "sourceReference": "source-p01-003-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "common.paint_erase",
      "textSha256": "5e7a78ccfd5b44af8d83b33161c37619c7a510651d4f80baddccedbd68f57b45",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f",
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944",
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50",
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803",
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c",
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763",
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f",
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/common-paint_erase.mp3",
      "sha256": "ee8a5e1d0dfbd34e2780e8551c2d9a25f182e0cf5a7f1f03bfbdfaf4b1f20150",
      "bytes": 103454,
      "durationSeconds": 5.407,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p01-20261110",
        "sourceReference": "source-p01-004-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "common.paint_undo",
      "textSha256": "1f638b1b5f8e740a9bca2811ceb64e20cbf6f8ac2fca705326dd18c94cceb907",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f",
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944",
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50",
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803",
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c",
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763",
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f",
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/common-paint_undo.mp3",
      "sha256": "5226743bf031c04eed67143b24e0ab4f276f1cc3d49e963722a891696ceedf8c",
      "bytes": 71271,
      "durationSeconds": 3.396,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p01-20261110",
        "sourceReference": "source-p01-005-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "common.paint_keyboard",
      "textSha256": "01dd6a9eb870205f8e9d3d2d83c59ebd8dd1a80910a76993190f1d1fc508e5c3",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f",
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944",
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50",
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803",
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c",
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763",
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f",
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/common-paint_keyboard.mp3",
      "sha256": "bfef3f3dbff486ae626c8bb108aca701da8f320395e679a1f6d61cdddab29b60",
      "bytes": 110977,
      "durationSeconds": 5.878,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p01-20261110",
        "sourceReference": "source-p01-006-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "common.life_invite",
      "textSha256": "d51dc355bed7c25def10cb077c1b8bc74d68e9939275682c512e41b6e0734b5b",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f",
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944",
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50",
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803",
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c",
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763",
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f",
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/common-life_invite.mp3",
      "sha256": "0c6fb54ab18993fd7e00b3f7ac5c2582170d887f9d3fa400351a2d60e918d86a",
      "bytes": 141906,
      "durationSeconds": 7.811,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p01-20261110",
        "sourceReference": "source-p01-007-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "common.life_show",
      "textSha256": "c102648f8dda2d9b789b14758f23f848706e74bdfb36a3b6a8de61169c1c9d4a",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f",
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944",
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50",
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803",
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c",
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763",
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f",
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/common-life_show.mp3",
      "sha256": "f96e2ebbb44c125b9b1d05e6f6ff2e2784a4c324915864f3e7a05bb93b4d2966",
      "bytes": 68763,
      "durationSeconds": 3.239,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p01-20261110",
        "sourceReference": "source-p01-008-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "common.life_no_paint",
      "textSha256": "1fd8fa6c713345e93677ba73be0c723e5fe230235bd1ee6db887892614cb6d16",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f",
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944",
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50",
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803",
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c",
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763",
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f",
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/common-life_no_paint.mp3",
      "sha256": "5efe76c1ce99b48f883cfa661917b3dc6d174f16f2bdff8dcf5e99464897a055",
      "bytes": 90497,
      "durationSeconds": 4.598,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p01-20261110",
        "sourceReference": "source-p01-009-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "common.life_pause",
      "textSha256": "03b37df6cf6ef57b14969c04376c2f1d38882526b07a2ba7bad3f2be5e15fb5e",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f",
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944",
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50",
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803",
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c",
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763",
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f",
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/common-life_pause.mp3",
      "sha256": "20e0e80155a5bccf092a72588175e0c6e63bd0f54e188033e9b39cb4997201e6",
      "bytes": 77541,
      "durationSeconds": 3.788,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p01-20261110",
        "sourceReference": "source-p01-010-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "common.finished",
      "textSha256": "08239830f44596714da96346f5ceb6208da80afaf47e77364c48bc5b7a805635",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f",
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944",
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50",
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803",
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c",
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763",
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f",
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/common-finished.mp3",
      "sha256": "a91e38e16bcabcb9f344ab70ed18c7958c79cb254fa28f55f2e559bed49b0b18",
      "bytes": 96767,
      "durationSeconds": 4.989,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p01-20261110",
        "sourceReference": "source-p01-011-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "common.permission_to_observe",
      "textSha256": "3c0deafa3a38fb0682ee7fdff8fad294b29226b8a06618149326ec3aed2717bd",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f",
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944",
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50",
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803",
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c",
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763",
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f",
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/common-permission_to_observe.mp3",
      "sha256": "4dd8c430631851a3b968bd70793b905730ac73d1d7c967ba4469fa095ca1e19c",
      "bytes": 123934,
      "durationSeconds": 6.687,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p01-20261110",
        "sourceReference": "source-p01-012-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "common.skip_sounds",
      "textSha256": "d109f78c3da8ec966c12e85facc45b9e3fda79273f88fb2293652b9a0af6f042",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f",
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944",
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50",
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803",
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c",
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763",
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f",
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/common-skip_sounds.mp3",
      "sha256": "2102bc383d9b692e0b83729d86d4f32a1f92fef7810fcee99244e8425331686e",
      "bytes": 68763,
      "durationSeconds": 3.239,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p01-20261110",
        "sourceReference": "source-p01-013-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.cachorro.discovery_2_3",
      "textSha256": "eb6a66cf991a5827f23d685d4a76c4957d55294d99dca12ffcb24c4d6312c1ba",
      "bindings": [
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-cachorro-discovery_2_3.mp3",
      "sha256": "c5c4d99aeb223b020d1e5ef5103039f61c04c494e5cd208154a3692ad35bf9da",
      "bytes": 73779,
      "durationSeconds": 3.553,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p02-20261110",
        "sourceReference": "source-p02-001-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.cachorro.sound_4_5",
      "textSha256": "723ee61b30224850525d9ca4732794e6f8d3931db933d85a55e5c853c1983448",
      "bindings": [
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-cachorro-sound_4_5.mp3",
      "sha256": "b30e9c9430cbabb866020f8870179d81fdffc62be22bd24423da24d8ddeecdf6",
      "bytes": 163640,
      "durationSeconds": 9.169,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p02-20261110",
        "sourceReference": "source-p02-002-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.cachorro.letter_4_5",
      "textSha256": "1d48814387d58306ac99738188f5f3fa9a4c385496b7690c824c161e0946e1de",
      "bindings": [
        "coloring:cachorro:RS-INF-COLORIR-CACHORRO-001:1:f25ecc9ca464fe95f443e412f56560244a409f6edb454a7069e20f9754722b50"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-cachorro-letter_4_5.mp3",
      "sha256": "baccab9233cc1c5ab591259037f5c5a4a89582d75a6c10b9c087c6d686548af5",
      "bytes": 126442,
      "durationSeconds": 6.844,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p02-20261110",
        "sourceReference": "source-p02-003-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.preguica.welcome",
      "textSha256": "19416e830b81e517ef7cc18729e4b34fa38d8d25c359c90ffb92c05c76b2844e",
      "bindings": [
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-preguica-welcome.mp3",
      "sha256": "337eefae2524981bbab2074fdcd48bdd6efb83d5f84c654fffad2b8624219385",
      "bytes": 110977,
      "durationSeconds": 5.878,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p03-20261110",
        "sourceReference": "source-p03-001-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.preguica.discovery_2_3",
      "textSha256": "423843673a4590ef75f40291115ea84bf1af10ee277216efd11327bdc319da6e",
      "bindings": [
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-preguica-discovery_2_3.mp3",
      "sha256": "5593246d6b1a94bac5baf540dc731d55f8bc42450a0a8b9479112b7e02a77649",
      "bytes": 75033,
      "durationSeconds": 3.631,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p03-20261110",
        "sourceReference": "source-p03-002-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.preguica.discovery_4_5",
      "textSha256": "95febca2a80731e6f06b60b7cfbfeabc3b8e72a0b9e12f6882ff94be529463db",
      "bindings": [
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-preguica-discovery_4_5.mp3",
      "sha256": "1fd744a258f2cf6782d5eb07c678836364740f8ae8205b8de9b456914ae565bc",
      "bytes": 125188,
      "durationSeconds": 6.766,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p03-20261110",
        "sourceReference": "source-p03-003-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.preguica.sound_4_5",
      "textSha256": "f81fab7518de7b548b84d6401cc3dec4248bf402e8252bd997e1e8a33035550f",
      "bindings": [
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-preguica-sound_4_5.mp3",
      "sha256": "f6869965113b3f2e83de59c185bd90e45d3c7c28f609f336e7d5d135d351cd00",
      "bytes": 162386,
      "durationSeconds": 9.091,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p03-20261110",
        "sourceReference": "source-p03-004-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.preguica.letter_4_5",
      "textSha256": "57c9b9a756fa3c0b53a2e47bcaded666e3dbadbffbc8e531b9fb82ff0ce5a4fb",
      "bindings": [
        "coloring:preguica:RS-INF-COLORIR-PREGUICA-001:1:2094e5212722049ee15006445be0abb99aaef70ebe05de6d92918bb3edcfa148"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-preguica-letter_4_5.mp3",
      "sha256": "e55775525048e0b2a16ff503a833040abd830888984cb3e9c6ad4ca781f34e8c",
      "bytes": 109723,
      "durationSeconds": 5.799,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p03-20261110",
        "sourceReference": "source-p03-005-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.borboleta.welcome",
      "textSha256": "25c96c8ee7a42c4b76935f659988b68a8a4c95356655ee97d9060989325b5a48",
      "bindings": [
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-borboleta-welcome.mp3",
      "sha256": "08c54278b4a70fdfa877e09d6af25570e7276b8a06c58ae370c1b601de37f6c8",
      "bytes": 109723,
      "durationSeconds": 5.799,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p04-20261110",
        "sourceReference": "source-p04-001-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.borboleta.discovery_2_3",
      "textSha256": "29c309da682eaca1df1b1751f7cffe88c07d758be0c3398495069dfe8405a8c9",
      "bindings": [
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-borboleta-discovery_2_3.mp3",
      "sha256": "1a03804d480aafd443fda501a1a3acd43eb7ad8230b7c2d8b0e1042d069589cd",
      "bytes": 77541,
      "durationSeconds": 3.788,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p04-20261110",
        "sourceReference": "source-p04-002-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.borboleta.discovery_4_5",
      "textSha256": "3430d5a048de7a6e5861358d0fba6730b1ed93c7a11c5fedd063fe81f4dc782a",
      "bindings": [
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-borboleta-discovery_4_5.mp3",
      "sha256": "32f9f9842420f5c3b2f09aa28d325fb073267cbb8a617d1f6534a248df84bfc4",
      "bytes": 122680,
      "durationSeconds": 6.609,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p04-20261110",
        "sourceReference": "source-p04-003-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.borboleta.sound_4_5",
      "textSha256": "78b364d321567b421e9379bcc0de514ba71e702f83dc63e1a240ad7d353fb3d5",
      "bindings": [
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-borboleta-sound_4_5.mp3",
      "sha256": "cb58c158c6afd00320e62f4f46d9718fa8202d30fb1e7483528f3c95a30dbc3a",
      "bytes": 140234,
      "durationSeconds": 7.706,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p04-20261110",
        "sourceReference": "source-p04-004-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.borboleta.letter_4_5",
      "textSha256": "0c52bb61e7706763f5c3f580f138a6bfe425a57e882f1bdd6564644d6012a1f0",
      "bindings": [
        "coloring:borboleta:RS-INF-COLORIR-BORBOLETA-001:1:af6258be30f64501f1d41d1682bd6383248b934c683917c3ebedfce4d42b9944"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-borboleta-letter_4_5.mp3",
      "sha256": "48e50b14dc233f137d6d5fb52d6881fe1e275949b3eb378a0e0122de5f6bc0cb",
      "bytes": 123934,
      "durationSeconds": 6.687,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p04-20261110",
        "sourceReference": "source-p04-005-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.peixe.welcome",
      "textSha256": "fc1e83fac054d2c80ea6f52d5daf7dcc0cbdf09391e7cbd80267368a7cf626e1",
      "bindings": [
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-peixe-welcome.mp3",
      "sha256": "efe8ee0fb1b848186a87c94cd5f6275a7856969baac1ed65c535633560c91b6d",
      "bytes": 131457,
      "durationSeconds": 7.157,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p05-20261110",
        "sourceReference": "source-p05-001-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.peixe.discovery_2_3",
      "textSha256": "425cd8a6e7fe2e096133db1f12552074365dfbcad6dff7ba44bd38feec9e1d78",
      "bindings": [
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-peixe-discovery_2_3.mp3",
      "sha256": "1caf3e495f73a3c9c4573cbc5d7ba93854d918ac506637e313179258ead3f172",
      "bytes": 68763,
      "durationSeconds": 3.239,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p05-20261110",
        "sourceReference": "source-p05-002-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.peixe.discovery_4_5",
      "textSha256": "ad2c69f215a3f1956d5c3f5af4d8a993635c1273d6030f42cc6cecfac7c76835",
      "bindings": [
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-peixe-discovery_4_5.mp3",
      "sha256": "f14061e02e7a89f4ed4c352c5b514d12ad5658bb1567b4ccb6953e99ca5757ab",
      "bytes": 113485,
      "durationSeconds": 6.034,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p05-20261110",
        "sourceReference": "source-p05-003-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.peixe.sound_4_5",
      "textSha256": "5c8ec94369bbc0ecf02dd38bb99b95e81f7391dc2d56dd94a4ba9860595f24d6",
      "bindings": [
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-peixe-sound_4_5.mp3",
      "sha256": "f0ff174cd2f764819d103cdfa766c1c73f2ddb992a14ed75a32beefbe392358d",
      "bytes": 151937,
      "durationSeconds": 8.438,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p05-20261110",
        "sourceReference": "source-p05-004-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.peixe.letter_4_5",
      "textSha256": "525e30bda1edff97676b391d4393238ba6ddc298826064eb507b3b7ca7275e1f",
      "bindings": [
        "coloring:peixe:RS-INF-COLORIR-PEIXE-001:1:8a808e7aa577977b3e2e76d48d04a1e9052ca7489f8607a7ee3c2dcc7faf336f"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-peixe-letter_4_5.mp3",
      "sha256": "b2df9a1468f6408b0e589a9d1a9bfd43aeb05e3e8e8f5f4e7dc0e663ff6fa7f2",
      "bytes": 115993,
      "durationSeconds": 6.191,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p05-20261110",
        "sourceReference": "source-p05-005-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.banana.welcome",
      "textSha256": "6dc1c7ef9bac51babd0904d42306fc3574fb455f829b02d0463e58d432939218",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-banana-welcome.mp3",
      "sha256": "a8a8f7aa785454fd263da815465c1dea842eb4aafd325a03a9ac17a41cb828c0",
      "bytes": 122680,
      "durationSeconds": 6.609,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p06-20261110",
        "sourceReference": "source-p06-001-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.banana.discovery_2_3",
      "textSha256": "d034ec7e0431e57695f7306f38f6a1069db7892a4f1a05973f3dbfc178f5ff78",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-banana-discovery_2_3.mp3",
      "sha256": "a24d8094f8293cfb0b3f2c3e7633f91e42785a0d5097aa053c7aa59642946bf5",
      "bytes": 66256,
      "durationSeconds": 3.082,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p06-20261110",
        "sourceReference": "source-p06-002-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.banana.discovery_4_5",
      "textSha256": "3770247d4e881975108824bcc99fa1a6c52a6985a90507cb0fa3c17c599e11e2",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-banana-discovery_4_5.mp3",
      "sha256": "d6baa8ac084bba57bedbf7f09f47f176d2ee2f96d11bcaacad2a95abaf06ffb8",
      "bytes": 130203,
      "durationSeconds": 7.079,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p06-20261110",
        "sourceReference": "source-p06-003-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.banana.sound_4_5",
      "textSha256": "b08773445d7a33080223176439c9cfb1def61dddae9d2c26ecbd02392bd1a440",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-banana-sound_4_5.mp3",
      "sha256": "2cb8c60ffe32205f29dd013a78dbdb22ff064ea895c92ac57fa153e17d710639",
      "bytes": 138981,
      "durationSeconds": 7.628,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p06-20261110",
        "sourceReference": "source-p06-004-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.banana.letter_4_5",
      "textSha256": "9b141272c2ebc709c863f0019952146b516c949586c271c13ba176d25d51a65b",
      "bindings": [
        "coloring:banana:RS-INF-COLORIR-BANANA-001:1:9c4933edb9bf98e16baff67580a516e008b8d5f83767439feb1e5e93ca277d0f"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-banana-letter_4_5.mp3",
      "sha256": "05184d8238b48133306c92a0bccedb5eccddb3e54ad10ad5abfda9b83564aa8c",
      "bytes": 118501,
      "durationSeconds": 6.348,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p06-20261110",
        "sourceReference": "source-p06-005-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.cenoura.welcome",
      "textSha256": "d95928b4e4a96ab815b1e638fc9900af70e6f0350c92a9299c2704fd17abbe6d",
      "bindings": [
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-cenoura-welcome.mp3",
      "sha256": "05f840061635d4919fe392a004f6ffc4d512c056daaba3fb2bae36d874a4ac70",
      "bytes": 104708,
      "durationSeconds": 5.486,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p07-20261110",
        "sourceReference": "source-p07-001-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.cenoura.discovery_2_3",
      "textSha256": "965b87e5efb0f5cf6170b81e9b47e91bdd3830478576c4bd8032f86c9a35bb58",
      "bindings": [
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-cenoura-discovery_2_3.mp3",
      "sha256": "a4ea6a9fc1a2e520aa4ee1f1b85853af683f0b9768de420e30fe409b8678c815",
      "bytes": 68763,
      "durationSeconds": 3.239,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p07-20261110",
        "sourceReference": "source-p07-002-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.cenoura.discovery_4_5",
      "textSha256": "3786f2066b2aad82dd6ace3d53c94401a431174046e2492696efb7dd8180aac5",
      "bindings": [
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-cenoura-discovery_4_5.mp3",
      "sha256": "e57cb73c06eb2145d37f1f0d35bd5207bf0d3816d17856ee6192525fef1a785e",
      "bytes": 130203,
      "durationSeconds": 7.079,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p07-20261110",
        "sourceReference": "source-p07-003-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.cenoura.sound_4_5",
      "textSha256": "53fd594151f24fcbc2f54fe2c9fa5dc3454324de0e0d581eb743476ba2b64aaa",
      "bindings": [
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-cenoura-sound_4_5.mp3",
      "sha256": "4f0f6df3cef8097c5f7bbb8b9a0c9372289a7467331bac77fb97753de9c0d16d",
      "bytes": 168656,
      "durationSeconds": 9.482,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p07-20261110",
        "sourceReference": "source-p07-004-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.cenoura.letter_4_5",
      "textSha256": "07954c16492e063b380765dcca5c7627c853a64fc4dd0984cbc5646cb805a020",
      "bindings": [
        "coloring:cenoura:RS-INF-COLORIR-CENOURA-001:1:820039c7c9d63a270175bafb1f541d35fd5761d11c2f0e3b570249e482014803"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-cenoura-letter_4_5.mp3",
      "sha256": "ec9c7c33de1d4f5bc3a16b1478d5af6924a18a12b5fcced3e3f8d5b1c81749fa",
      "bytes": 173671,
      "durationSeconds": 9.796,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p07-20261110",
        "sourceReference": "source-p07-005-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.leao.welcome",
      "textSha256": "9570391e2759d0ff683c39133a1342e7574652c3b49d1267e6567c5cd5d99725",
      "bindings": [
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-leao-welcome.mp3",
      "sha256": "27831f736cf8cf45918eb8aa3ad9243b24c36c6b2103a146ae613b80c59853be",
      "bytes": 107216,
      "durationSeconds": 5.642,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p08-20261110",
        "sourceReference": "source-p08-001-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.leao.discovery_2_3",
      "textSha256": "f1f15f923f7b2deac08524e5113c89a7ada5c9950355685c8513c0e76dd05920",
      "bindings": [
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-leao-discovery_2_3.mp3",
      "sha256": "7f26bffb2c19250639a9f6207791c94341550dbb964ba7ec18ed36368c48452f",
      "bytes": 94259,
      "durationSeconds": 4.833,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p08-20261110",
        "sourceReference": "source-p08-002-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.leao.discovery_4_5",
      "textSha256": "dd7fd612f3ade15ec4f256206ed4d2ed35a36ec160aa6d2bd5f3de0774c97eff",
      "bindings": [
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-leao-discovery_4_5.mp3",
      "sha256": "781a3c2582d602859ecf522ac55e3138033b0b9228fcdb12b753af6f951bfd12",
      "bytes": 156953,
      "durationSeconds": 8.751,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p08-20261110",
        "sourceReference": "source-p08-003-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.leao.sound_4_5",
      "textSha256": "67abc01be18380ff79f6c34957f4ad7046738bd4974ca4e5379c539dbe2f6176",
      "bindings": [
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-leao-sound_4_5.mp3",
      "sha256": "c590e0a9ff8dc7d53106d4995947336a37579e68edebf56bdbe8c24aeaa3e45b",
      "bytes": 144414,
      "durationSeconds": 7.967,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p08-20261110",
        "sourceReference": "source-p08-004-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.leao.letter_4_5",
      "textSha256": "255140d5a8be615131bfcc445703b4f23240a5c417dad903d50cd72623292493",
      "bindings": [
        "coloring:leao:RS-INF-COLORIR-LEAO-001:1:20402a8ff70d1c124cbc6e71b20adb499c825720e033e91ff91afddf565b664c"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-leao-letter_4_5.mp3",
      "sha256": "47b68833bdda1a6582ebdcc2afed2b809ed066cfcfb9538b2f1368715152fe01",
      "bytes": 122680,
      "durationSeconds": 6.609,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p08-20261110",
        "sourceReference": "source-p08-005-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.numero3.welcome",
      "textSha256": "05293ce7456d7925f380eeec6e67b6564439d0f799b252e93ad90aabdb3eded4",
      "bindings": [
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-numero3-welcome.mp3",
      "sha256": "e36fdc0cf9fcd9f4536273a1179d38aad20f7ae940f0dc77ef6d7c25745da7dc",
      "bytes": 98021,
      "durationSeconds": 5.068,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p09-20261110",
        "sourceReference": "source-p09-001-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.numero3.discovery_2_3",
      "textSha256": "401c7793d82fab972f6b64be7a4daf293d2368f42129ef0b42fb61fe3df78f59",
      "bindings": [
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-numero3-discovery_2_3.mp3",
      "sha256": "7e1036102813d073eae570d2703572a98eb9c5011d9f8ba806a4325f76565c92",
      "bytes": 93005,
      "durationSeconds": 4.754,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p09-20261110",
        "sourceReference": "source-p09-002-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.numero3.discovery_4_5",
      "textSha256": "5c0fe501e02d3b3a3559cd44b021d3c90642f434ef2ceec12496ba376f3a0d3b",
      "bindings": [
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-numero3-discovery_4_5.mp3",
      "sha256": "3d615f6c0e1273e05187d72d8ae051cd72a841cbb8a4283fb53642664d8cda25",
      "bytes": 104708,
      "durationSeconds": 5.486,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p09-20261110",
        "sourceReference": "source-p09-003-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.numero3.count_invite",
      "textSha256": "f7811f655c7874fd89a5637ac383d9f0abad4cea11f01cfcb31b44d5258d06cf",
      "bindings": [
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-numero3-count_invite.mp3",
      "sha256": "c6fed680f301f10910778042917328fcc1627ccc6f750e7634b2af59cbab08b0",
      "bytes": 115993,
      "durationSeconds": 6.191,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p09-20261110",
        "sourceReference": "source-p09-004-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.numero3.count_one",
      "textSha256": "167aaa7fcad03d91e2946f0045319904d847c8f15290a246cb02782bd926303a",
      "bindings": [
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-numero3-count_one.mp3",
      "sha256": "0610116fc1ad2a55ffe32938f71531a5abc0c115399457fca92b9388bc324ff5",
      "bytes": 39506,
      "durationSeconds": 1.411,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p09-20261110",
        "sourceReference": "source-p09-005-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.numero3.count_two",
      "textSha256": "90928e33cd170bc094ff409f921c26a03fb53f0aef1cdadeadbf4c203510622c",
      "bindings": [
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-numero3-count_two.mp3",
      "sha256": "62414d9b7721f22908d3d74060e822cd4df43b37831461e0c32aef591765cc1c",
      "bytes": 40760,
      "durationSeconds": 1.489,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p09-20261110",
        "sourceReference": "source-p09-006-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "colorir.numero3.count_reset",
      "textSha256": "036aa16028248129990f0c977af5510b0214a3e894a8843a98b94634fd70bc66",
      "bindings": [
        "coloring:numero3:RS-INF-COLORIR-NUMERO3-001:1:750e56f9a4ab7f6a085b190da7d2814e37a8d172b581c2e84530e3c8839a4763"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/colorir-numero3-count_reset.mp3",
      "sha256": "0ef2e942483bf16e4aa4d85a0f1c756c822f9f8f36ca505f25623849ecfa8010",
      "bytes": 89243,
      "durationSeconds": 4.519,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p09-20261110",
        "sourceReference": "source-p09-007-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "quiz-entrada",
      "textSha256": "63c6a3bcf39f11d74bb06fe96fb66b77c41c84e8f3fb65d362d9093a7c209513",
      "bindings": [
        "game:ed05-EF1-ciencias-variedades-quiz-01:quiz:012f1f76874dd36ba25a2680d08f52ca5d23dc6ee3a993a42f67814f6e34beb3"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/quiz-entrada.mp3",
      "sha256": "b51c96c8ef84a2f3f56e9e62e65e9ba89fd10e7ab7a40581f8a15eaca2821d15",
      "bytes": 119754,
      "durationSeconds": 6.426,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p10-20261110",
        "sourceReference": "source-p10-001-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "quiz-ajuda",
      "textSha256": "c77d97e6a09d67ffa7618ab6dcbe71444756baf5642bb61504695071a107b0f3",
      "bindings": [
        "game:ed05-EF1-ciencias-variedades-quiz-01:quiz:012f1f76874dd36ba25a2680d08f52ca5d23dc6ee3a993a42f67814f6e34beb3"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/quiz-ajuda.mp3",
      "sha256": "81708b515dac05fd5eafe162a4c776dd00dc73bbc240209af875e102ecdfe6e8",
      "bytes": 98021,
      "durationSeconds": 5.068,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p10-20261110",
        "sourceReference": "source-p10-002-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "quiz-celebracao",
      "textSha256": "03ad2257c0b6510cc93d6850176fbc6daa0a969e2d10a78870e2ad50399d2752",
      "bindings": [
        "game:ed05-EF1-ciencias-variedades-quiz-01:quiz:012f1f76874dd36ba25a2680d08f52ca5d23dc6ee3a993a42f67814f6e34beb3"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/quiz-celebracao.mp3",
      "sha256": "4e1de75a91e995218c295b39ac68d52fe1e8158643e222172a74fe786a5a93a0",
      "bytes": 89243,
      "durationSeconds": 4.519,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p10-20261110",
        "sourceReference": "source-p10-003-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "quiz-exemplo-ajuda",
      "textSha256": "69995b68e3751cc0b54dbcf05e451d5f25341c02fdefea9ef2177a33ed6fb49b",
      "bindings": [
        "game:ed05-EF1-ciencias-variedades-quiz-01:quiz:012f1f76874dd36ba25a2680d08f52ca5d23dc6ee3a993a42f67814f6e34beb3"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/quiz-exemplo-ajuda.mp3",
      "sha256": "3e2d536ae66574de650dcb0508ded8beb474df9fc874ca2d49b5eeb5b5d554e7",
      "bytes": 114739,
      "durationSeconds": 6.113,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p10-20261110",
        "sourceReference": "source-p10-004-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "quiz-exemplo-explicacao",
      "textSha256": "2fbdb71e6a0dacd1be6e4aa46c4b28e42deace4b70017f25cd0a718e8361a5cc",
      "bindings": [
        "game:ed05-EF1-ciencias-variedades-quiz-01:quiz:012f1f76874dd36ba25a2680d08f52ca5d23dc6ee3a993a42f67814f6e34beb3"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/quiz-exemplo-explicacao.mp3",
      "sha256": "9e999941cbbf0505f1e06cea758e6ed91780db75e3335d6c8fdd1a9a50db0406",
      "bytes": 107216,
      "durationSeconds": 5.642,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p10-20261110",
        "sourceReference": "source-p10-005-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "association-entrada",
      "textSha256": "28dd94bb4568db9efe7fa7d13e17524bf37253e91c0ecc65053c11d3abf1ebb9",
      "bindings": [
        "game:ed05-EF4-ciencias-variedades-association-01:association:01dbb3acc462c9aefb269a01666c597c8578ad104c9c0f4fc8c5147fc8795545"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/association-entrada.mp3",
      "sha256": "427c8c655a0a1d43314a9ec32262678f467f8dc011ae2d9b2b19684d4a1ef73f",
      "bytes": 112231,
      "durationSeconds": 5.956,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p11-20261110",
        "sourceReference": "source-p11-001-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "association-ajuda",
      "textSha256": "f7baa637b01d54cb8ea3c67a415addb2dd2caba504a815b303df28c6a3aefa75",
      "bindings": [
        "game:ed05-EF4-ciencias-variedades-association-01:association:01dbb3acc462c9aefb269a01666c597c8578ad104c9c0f4fc8c5147fc8795545"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/association-ajuda.mp3",
      "sha256": "08657fda9d258f5488cf8ae0387aa03b11cb329b6977d87567b5533c40524ed3",
      "bytes": 109723,
      "durationSeconds": 5.799,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p11-20261110",
        "sourceReference": "source-p11-002-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "association-celebracao",
      "textSha256": "dee94f35a98441501570dfed1f4f2133e576d494db5eaab8001fa65161e216bc",
      "bindings": [
        "game:ed05-EF4-ciencias-variedades-association-01:association:01dbb3acc462c9aefb269a01666c597c8578ad104c9c0f4fc8c5147fc8795545"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/association-celebracao.mp3",
      "sha256": "d4fd4762fb9f88def964d973a1c6f4711b65855f60b778728389d9bc0a6fa5aa",
      "bytes": 103454,
      "durationSeconds": 5.407,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p11-20261110",
        "sourceReference": "source-p11-003-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "association-exemplo-pergunta",
      "textSha256": "eab213a47c8e4a4b3719e389002f09ad407166b562396b45efe95501aa1bf377",
      "bindings": [
        "game:ed05-EF4-ciencias-variedades-association-01:association:01dbb3acc462c9aefb269a01666c597c8578ad104c9c0f4fc8c5147fc8795545"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/association-exemplo-pergunta.mp3",
      "sha256": "aeb53b8edc5ab202ab63c907babd9dd505d01183818a01016934624ed615230d",
      "bytes": 185374,
      "durationSeconds": 10.527,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p11-20261110",
        "sourceReference": "source-p11-004-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "association-exemplo-ajuda",
      "textSha256": "295caececfe609b2517856f4ad139200e659376049bc38f6814f228f818b357a",
      "bindings": [
        "game:ed05-EF4-ciencias-variedades-association-01:association:01dbb3acc462c9aefb269a01666c597c8578ad104c9c0f4fc8c5147fc8795545"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/association-exemplo-ajuda.mp3",
      "sha256": "1b49675ebbb56b50172ff6c710a247c99be6d2a61d6fa3d8f6ca051c8f5f63b0",
      "bytes": 118501,
      "durationSeconds": 6.348,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p11-20261110",
        "sourceReference": "source-p11-005-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "association-exemplo-explicacao",
      "textSha256": "cc759075531de4ce5f36aec4a53a9891f3abf866e4821867d0c45e6e2cc754dd",
      "bindings": [
        "game:ed05-EF4-ciencias-variedades-association-01:association:01dbb3acc462c9aefb269a01666c597c8578ad104c9c0f4fc8c5147fc8795545"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/association-exemplo-explicacao.mp3",
      "sha256": "36995fa6cb1d206b5cb4401048f022ff8ac38cb8c2540e44d27791dabbacf989",
      "bytes": 136473,
      "durationSeconds": 7.471,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p11-20261110",
        "sourceReference": "source-p11-006-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "memory-entrada",
      "textSha256": "a12eb0bada5cd89c9810db2a11eb45e4485175158fc7498ce5d3c8ddc1efec03",
      "bindings": [
        "game:ed05-EI4-ciencias-variedades-memory-01:memory:af60842c5389baf73eef89740b1fb62af8ef8fe5e4b00ccabc033870d696945e"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/memory-entrada.mp3",
      "sha256": "d7d68619fdbdee63a7dd276ba6dd192ea5a1132161c8e269b10aefada154e3ae",
      "bytes": 122680,
      "durationSeconds": 6.609,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p12-20261110",
        "sourceReference": "source-p12-001-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "memory-ajuda",
      "textSha256": "3309414c86c1cc670b5669beef8bf80c22915606e70f35ae74a03ad49222e7e1",
      "bindings": [
        "game:ed05-EI4-ciencias-variedades-memory-01:memory:af60842c5389baf73eef89740b1fb62af8ef8fe5e4b00ccabc033870d696945e"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/memory-ajuda.mp3",
      "sha256": "b11a660fb145dc6310af09159fa43d12de81b9c54653b1118269bbf1acbdd730",
      "bytes": 98021,
      "durationSeconds": 5.068,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p12-20261110",
        "sourceReference": "source-p12-002-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "memory-celebracao",
      "textSha256": "7b2a452e69cbc47074cf6f476d34f9010633be2f4b4f9da1dbcffcccd53f4091",
      "bindings": [
        "game:ed05-EI4-ciencias-variedades-memory-01:memory:af60842c5389baf73eef89740b1fb62af8ef8fe5e4b00ccabc033870d696945e"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/memory-celebracao.mp3",
      "sha256": "580efaec8402a272140ff7c3d2e92b390263248382738f6996f29d0f4077224a",
      "bytes": 89243,
      "durationSeconds": 4.519,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p12-20261110",
        "sourceReference": "source-p12-003-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "memory-exemplo-pergunta",
      "textSha256": "6e5e2901aad2343d18b292c49566665bd2a91c5cb6679102b939c7d45492180a",
      "bindings": [
        "game:ed05-EI4-ciencias-variedades-memory-01:memory:af60842c5389baf73eef89740b1fb62af8ef8fe5e4b00ccabc033870d696945e"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/memory-exemplo-pergunta.mp3",
      "sha256": "eef10e57e274a11c590580fc9ab63daf6ef468b5cc33c59cb468b4fd39742e07",
      "bytes": 132711,
      "durationSeconds": 7.236,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p12-20261110",
        "sourceReference": "source-p12-004-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "memory-exemplo-ajuda",
      "textSha256": "a6a92399531e31981ff0b745fbd305acd61450d5cd1be3b1f31c7dec96401112",
      "bindings": [
        "game:ed05-EI4-ciencias-variedades-memory-01:memory:af60842c5389baf73eef89740b1fb62af8ef8fe5e4b00ccabc033870d696945e"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/memory-exemplo-ajuda.mp3",
      "sha256": "c56939efd1e5032310cd62bd0691264b6942c7e103f666165649da1132f087e1",
      "bytes": 102200,
      "durationSeconds": 5.329,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p12-20261110",
        "sourceReference": "source-p12-005-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "memory-exemplo-explicacao",
      "textSha256": "4e0b16a0ca6667173564337997f7d9da493526a8dc1eba1339cca7db39816adb",
      "bindings": [
        "game:ed05-EI4-ciencias-variedades-memory-01:memory:af60842c5389baf73eef89740b1fb62af8ef8fe5e4b00ccabc033870d696945e"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/memory-exemplo-explicacao.mp3",
      "sha256": "86e13eb3fc59e95195e05feffdc030cf0966dc19015b02580b85cc5af9edfeec",
      "bytes": 104708,
      "durationSeconds": 5.486,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p12-20261110",
        "sourceReference": "source-p12-006-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "sequence-entrada",
      "textSha256": "f1d90ae8369dab68ca2dd825df87048e878417e4df91bd80b88ffdba5361196c",
      "bindings": [
        "game:ed05-EF1-matematica-sequence-01:sequence:1d654959816600489dcd32bc153eb0ee4533c29a9412938d6269f64f83576124"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/sequence-entrada.mp3",
      "sha256": "0b8a350aa593a62e9f15628f99f39a267386db467a9ab478bb8173fe844e7cea",
      "bytes": 132711,
      "durationSeconds": 7.236,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p13-20261110",
        "sourceReference": "source-p13-001-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "sequence-ajuda",
      "textSha256": "ddac131bb91cf5a2f2c844698324fa2bd30c71211906dc55d418500855cb2525",
      "bindings": [
        "game:ed05-EF1-matematica-sequence-01:sequence:1d654959816600489dcd32bc153eb0ee4533c29a9412938d6269f64f83576124"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/sequence-ajuda.mp3",
      "sha256": "4873fc62805cade7deff4b5026ba3f41c4067a6b3a2423ff5da36e0e4da037ec",
      "bytes": 122680,
      "durationSeconds": 6.609,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p13-20261110",
        "sourceReference": "source-p13-002-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "sequence-celebracao",
      "textSha256": "b9c56671a2e69b9d6b1c292c921c74d27fa65b5125a3ad535d1747e458b816c8",
      "bindings": [
        "game:ed05-EF1-matematica-sequence-01:sequence:1d654959816600489dcd32bc153eb0ee4533c29a9412938d6269f64f83576124"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/sequence-celebracao.mp3",
      "sha256": "d049c0cf56dc329959946477b20c9e5ee6715ec576798684cf99b6d785d5b5a7",
      "bytes": 95513,
      "durationSeconds": 4.911,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p13-20261110",
        "sourceReference": "source-p13-003-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "sequence-exemplo-pergunta",
      "textSha256": "3baaf4396483a6014a123df4c4517e970860e26f7f3740b281c47d76c5c01ea5",
      "bindings": [
        "game:ed05-EF1-matematica-sequence-01:sequence:1d654959816600489dcd32bc153eb0ee4533c29a9412938d6269f64f83576124"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/sequence-exemplo-pergunta.mp3",
      "sha256": "ad77ef40576ab14497198a5ea911a2b9484dd4e83e52de2b04b31da3171b2b43",
      "bytes": 158207,
      "durationSeconds": 8.829,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p13-20261110",
        "sourceReference": "source-p13-004-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "sequence-exemplo-ajuda",
      "textSha256": "a692e489b3e4fe61e69f4ec089fa8a7f0972a8f9df3017f13211bff51ba3aff0",
      "bindings": [
        "game:ed05-EF1-matematica-sequence-01:sequence:1d654959816600489dcd32bc153eb0ee4533c29a9412938d6269f64f83576124"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/sequence-exemplo-ajuda.mp3",
      "sha256": "38145b9b0d831e38278232edf6f36b8640f1cfb5a5aa142d6992b05d6963355f",
      "bytes": 131457,
      "durationSeconds": 7.157,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p13-20261110",
        "sourceReference": "source-p13-005-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "sequence-exemplo-explicacao",
      "textSha256": "364aa06e77d6866262c5e49545f32c3d6f7d4df1025df906011a241dddc19ff5",
      "bindings": [
        "game:ed05-EF1-matematica-sequence-01:sequence:1d654959816600489dcd32bc153eb0ee4533c29a9412938d6269f64f83576124"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/sequence-exemplo-explicacao.mp3",
      "sha256": "cfd37b76512cea56fc203cb0af88d467a881c5206811890084c07f1346051b5f",
      "bytes": 172417,
      "durationSeconds": 9.717,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p13-20261110",
        "sourceReference": "source-p13-006-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "classification-entrada",
      "textSha256": "1c0544d36faf8ebc3f1e7766950b344cd4be01d4e31d905090055d68a85bdefd",
      "bindings": [
        "game:ed05-EM1-matematica-classification-01:classification:f684c8fd3a1e387494b84544b1b98972bdcdf8fb8fa1658778b1dc5b68b6560a"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/classification-entrada.mp3",
      "sha256": "80d566023ae7bc29104a01723075feb1dd33c7cc79bda72ce2a58bcd486d21eb",
      "bytes": 108470,
      "durationSeconds": 5.721,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p14-20261110",
        "sourceReference": "source-p14-001-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "classification-ajuda",
      "textSha256": "316781863e0e1167b863e165e552f9b260d0beab833c5dae18f65ec8aa0e165d",
      "bindings": [
        "game:ed05-EM1-matematica-classification-01:classification:f684c8fd3a1e387494b84544b1b98972bdcdf8fb8fa1658778b1dc5b68b6560a"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/classification-ajuda.mp3",
      "sha256": "3d908e42c3157295cd64e6e321aaa55c1a4c5cea481af623ecbf1811d7ae7e8d",
      "bytes": 130203,
      "durationSeconds": 7.079,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p14-20261110",
        "sourceReference": "source-p14-002-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "classification-celebracao",
      "textSha256": "8a46c057a3def386bccf068039e1c5babfab7bb16a55141fabb5857d3451ab12",
      "bindings": [
        "game:ed05-EM1-matematica-classification-01:classification:f684c8fd3a1e387494b84544b1b98972bdcdf8fb8fa1658778b1dc5b68b6560a"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/classification-celebracao.mp3",
      "sha256": "b3ba791e2a02bdbff487ec85a49c190944984f4d23134461307307a5bf01b6e8",
      "bytes": 114739,
      "durationSeconds": 6.113,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p14-20261110",
        "sourceReference": "source-p14-003-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "classification-exemplo-pergunta",
      "textSha256": "f761b83de4be83b64bed102ce0eae037c1cd41bb47466e9aefdecd507e63cdc4",
      "bindings": [
        "game:ed05-EM1-matematica-classification-01:classification:f684c8fd3a1e387494b84544b1b98972bdcdf8fb8fa1658778b1dc5b68b6560a"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/classification-exemplo-pergunta.mp3",
      "sha256": "1a2bd73edf47ba3718e371d307364bf0382e8bb134c5a45d9f8625f48a6dc446",
      "bytes": 150683,
      "durationSeconds": 8.359,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p14-20261110",
        "sourceReference": "source-p14-004-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "classification-exemplo-ajuda",
      "textSha256": "92a1f41391f5777d0cfcc926f6583ccacfe5330bd576444615b6ae633c241f6c",
      "bindings": [
        "game:ed05-EM1-matematica-classification-01:classification:f684c8fd3a1e387494b84544b1b98972bdcdf8fb8fa1658778b1dc5b68b6560a"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/classification-exemplo-ajuda.mp3",
      "sha256": "06cf4612ff6f6476807bba0d0f7d291c8f9101ec3a07a462fa971fb5da956c2d",
      "bytes": 112231,
      "durationSeconds": 5.956,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p14-20261110",
        "sourceReference": "source-p14-005-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    },
    {
      "clipId": "classification-exemplo-explicacao",
      "textSha256": "463d23d147bc8067caad31e64496d6929fe02c78ce39282953c66a04cf6d47c7",
      "bindings": [
        "game:ed05-EM1-matematica-classification-01:classification:f684c8fd3a1e387494b84544b1b98972bdcdf8fb8fa1658778b1dc5b68b6560a"
      ],
      "status": "reviewed",
      "path": "mission-runtime/narration/audio/classification-exemplo-explicacao.mp3",
      "sha256": "be7d81d1206fb9905052e7248ea7061a9c7b41c0f1b24f4b6185bcddf8c92cc3",
      "bytes": 182866,
      "durationSeconds": 10.371,
      "voiceId": "m151rjrbWXbBqyq56tly",
      "modelLabel": "Eleven v4",
      "licenseId": "commercial-voice-20261110",
      "review": {
        "mode": "approved_voice_pilot + per_file_technical_and_source_checks",
        "reference": "source-technical-p14-20261110",
        "sourceReference": "source-p14-006-20261110",
        "sourceTextVerified": true,
        "sourceVerification": "generation_history",
        "independentTranscription": false,
        "listened": false,
        "individualAuditoryQuality": "not_assessed",
        "pilotReference": "voice-pilot-20261110-p00",
        "technical": {
          "hashVerified": true,
          "fullDecodePassed": true,
          "formatPassed": true
        }
      }
    }
  ]
});
