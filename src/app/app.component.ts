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

import { hideCandidateWords, logToStatusDisplay, plotPredictions, populateCandidateWords, showCandidateWords } from './ui';
import { NgxImageGalleryComponent, GALLERY_IMAGE, GALLERY_CONF } from 'ngx-image-gallery';
import { CONTEXT } from '@angular/core/src/render3/interfaces/view';

const commands = {
  LEFT: 'left',
  RIGHT: 'right',
  TOP: 'top',
  BOTTOM: 'bottom',
  YES: 'yes',
  NO: 'no',
  GO: 'go',
  STOP: 'stop',
  ZERO: 'zero',
  ONE: 'one',
  TWO: 'two',
  THREE: 'three',
  FOUR: 'four',
  FIVE: 'five',
  SIX: 'six',
  SEVEN: 'seven',
  EIGHT: 'eight',
  NINE: 'nine',
  TEN: 'ten'
};

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
  @ViewChild('player')
  player: ElementRef;
  @ViewChild('canvas')
  canvas: ElementRef;
  recognizer;
  transferWords;
  transferRecognizer;
  transferDurationMultiplier;
  startDisabled = true;
  stopDisabled = true;
  context: any;

  // get reference to gallery component
  @ViewChild(NgxImageGalleryComponent) ngxImageGallery: NgxImageGalleryComponent;

  // gallery configuration
  conf: GALLERY_CONF = {
    imageOffset: '0px',
    showDeleteControl: false,
    showImageTitle: false,
  };

  // gallery images
  images: GALLERY_IMAGE[] = [
    {
      url: 'https://images.pexels.com/photos/669013/pexels-photo-669013.jpeg?w=1260',
      altText: 'woman-in-black-blazer-holding-blue-cup',
      title: 'woman-in-black-blazer-holding-blue-cup',
      thumbnailUrl: 'https://images.pexels.com/photos/669013/pexels-photo-669013.jpeg?w=60'
    },
    {
      url: 'https://images.pexels.com/photos/669006/pexels-photo-669006.jpeg?w=1260',
      altText: 'two-woman-standing-on-the-ground-and-staring-at-the-mountain',
      extUrl: 'https://www.pexels.com/photo/two-woman-standing-on-the-ground-and-staring-at-the-mountain-669006/',
      thumbnailUrl: 'https://images.pexels.com/photos/669006/pexels-photo-669006.jpeg?w=60'
    },
  ];

  constructor() {

  }

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

    // setup video player
    const plr = this.player.nativeElement;
    const  constraints = {
      video: true
    };

    navigator.mediaDevices.getUserMedia(constraints)
      .then((stream: any) => {
        plr.srcObject = stream;
    });

    const canvas = this.canvas.nativeElement;
    this.context = canvas.getContext('2d');
  }

  capture() {
    console.log('cpature');
    const canvas = this.canvas.nativeElement;
    const context = canvas.getContext('2d');
    context.drawImage(this.player.nativeElement, 0, 0, canvas.width, canvas.height);
  }

  startButtonClick() {
    console.log('start button clicked', this.candidateWords);
    this.openGallery(0);
    const activeRecognizer = this.transferRecognizer == null ? this.recognizer : this.transferRecognizer;
    populateCandidateWords(activeRecognizer.wordLabels(), this.candidateWords.nativeElement);

    const suppressionTimeMillis = 1000;
    activeRecognizer.listen(
        result => {
          const topWord = plotPredictions(
              this.predictionCanvas, activeRecognizer.wordLabels(), result.scores,
              3, suppressionTimeMillis);
          console.log('result', topWord);
          this.moveGallery(topWord);
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


  // Gallery functions
  // METHODS
  // open gallery
  openGallery(index: number = 0) {
    this.ngxImageGallery.open(index);
  }

  moveGallery(topWord: string) {
    if (topWord === commands.LEFT) {
      this.prevImage();
    } else if (topWord === commands.RIGHT) {
      this.nextImage();
    } else if (topWord === commands.STOP) {
      this.closeGallery();
    } else if (topWord === commands.EIGHT) {
      this.openGallery();
    }
  }

  // close gallery
  closeGallery() {
    this.ngxImageGallery.close();
  }

  // set new active(visible) image in gallery
  newImage(index: number = 0) {
    this.ngxImageGallery.setActiveImage(index);
  }

  // next image in gallery
  nextImage() {
    this.ngxImageGallery.next();
  }

  // prev image in gallery
  prevImage() {
    this.ngxImageGallery.prev();
  }

  /**************************************************/

  // EVENTS
  // callback on gallery opened
  galleryOpened(index) {
    console.log('Gallery opened at index ', index);
  }

  // callback on gallery closed
  galleryClosed() {
    console.log('Gallery closed.');
  }

  // callback on gallery image clicked
  galleryImageClicked(index) {
    console.log('Gallery image clicked with index ', index);
  }
  // callback on gallery image changed
  galleryImageChanged(index) {
    console.log('Gallery image changed to index ', index);
  }

  // callback on user clicked delete button
  deleteImage(index) {
    console.log('Delete image at index ', index);
  }
}
