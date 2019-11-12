/**
 * @license
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';

import * as SpeechCommands from './src';

import {hideCandidateWords, logToStatusDisplay, plotPredictions, populateCandidateWords, showCandidateWords} from './ui';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
  title = 'Bobobot';
  @ViewChild('start')
  startButton: any;
  @ViewChild('stop')
  stopButton: any = document.getElementById('stop');
  @ViewChild('probaThreshold')
  probaThresholdInput: ElementRef;
  @ViewChild('candidateWords')
  candidateWords: ElementRef;
  @ViewChild('predictionCanvas')
  predictionCanvas: any;
  @ViewChild('statusDisplay')
  statusDisplay: any;
  recognizer;
  transferWords;
  transferRecognizer;
  transferDurationMultiplier;
  startDisabled = true;
  stopDisabled = true;

  ngOnInit() {

  }

  ngAfterViewInit() {
    logToStatusDisplay('Creating recognizer...', this.statusDisplay);
    this.recognizer = SpeechCommands.create('BROWSER_FFT');

    // Make sure the tf.Model is loaded through HTTP. If this is not
    // called here, the tf.Model will be loaded the first time
    // `listen()` is called.
    this.recognizer.ensureModelLoaded()
    .then(() => {
      // this.startButton.disabled = false;
      this.startDisabled = false;
      logToStatusDisplay('Model loaded.', this.statusDisplay);
      const params = this.recognizer.params();
      logToStatusDisplay(`sampleRateHz: ${params.sampleRateHz}`, this.statusDisplay);
      logToStatusDisplay(`fftSize: ${params.fftSize}`, this.statusDisplay);
      logToStatusDisplay(
          `spectrogramDurationMillis: ` +
          `${params.spectrogramDurationMillis.toFixed(2)}`, this.statusDisplay);
      logToStatusDisplay(
          `tf.Model input shape: ` +
          `${JSON.stringify(this.recognizer.modelInputShape())}`, this.statusDisplay);
    })
    .catch(err => {
      logToStatusDisplay(
          'Failed to load model for recognizer: ' + err.message, this.statusDisplay);
    });
  }

  startButtonClick() {
    console.log('start button clicked', this.candidateWords);
    const activeRecognizer = this.transferRecognizer == null ? this.recognizer : this.transferRecognizer;
    populateCandidateWords(activeRecognizer.wordLabels(), this.candidateWords.nativeElement);

    const suppressionTimeMillis = 1000;
    activeRecognizer.listen(
        result => {
          const topWord = plotPredictions(
              this.predictionCanvas, activeRecognizer.wordLabels(), result.scores,
              3, suppressionTimeMillis);
          console.log('result', topWord);
        },
        {
          includeSpectrogram: true,
          suppressionTimeMillis,
          probabilityThreshold: Number.parseFloat(this.probaThresholdInput.nativeElement.value)
        })
    .then(() => {
      this.startDisabled = true;
      this.stopDisabled = false;
      showCandidateWords();
      logToStatusDisplay('Streaming recognition started.');
    })
    .catch(err => {
      logToStatusDisplay(
          'ERROR: Failed to start streaming display: ' + err.message);
    });
  }

  stopButtonClick() {
    const activeRecognizer = this.transferRecognizer == null ? this.recognizer : this.transferRecognizer;this.startButton.disabled = false;
    activeRecognizer.stopListening()
      .then(() => {
        this.startDisabled = false;
        this.stopDisabled = true;
        hideCandidateWords();
        logToStatusDisplay('Streaming recognition stopped.');
      })
      .catch(err => {
        logToStatusDisplay(
            'ERROR: Failed to stop streaming display: ' + err.message);
      });
  }
}
