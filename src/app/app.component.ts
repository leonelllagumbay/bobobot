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
import { HttpClient, HttpHeaders, HttpResponse  } from '@angular/common/http';

const imageUrlSrc = 'http://192.168.43.226:8080/';

const frameImages = [
  'assets/images/erni_had.png',
  'assets/images/erni_had2.png',
  'assets/images/erni_had3.png',
  'assets/images/erni_had4.png',
  'assets/images/erni_had5.png',
  'assets/images/erni_had6.png',
];

const commands = {
  LEFT: 'left',
  RIGHT: 'right',
  UP: 'up',
  DOWN: 'down',
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
  private static readonly httpOptionsDefault = {
    headers: new HttpHeaders({
      Authorization: `Client-ID cff8420b96cded9`
    })
  };
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
  clientId = 'cff8420b96cded9';
  currentFrame = 0;
  originBase64: any;

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
  ];

  constructor(private readonly _http: HttpClient) {

  }

  ngOnInit() {
    this.getImages();
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

  recapture() {
    const image = new Image();
    image.src = this.originBase64;
    this.context.drawImage(image, 0, 0);
  }

  capture() {
    const canvas = this.canvas.nativeElement;
    this.context = canvas.getContext('2d');
    this.context.drawImage(this.player.nativeElement, 0, 0, canvas.width, canvas.height);


    const d = canvas.toDataURL('image/png');
    this.originBase64 = d;
    console.log('base url', d);
    // test http
    // this.getImages().subscribe((res: any) => {
    //   console.log('res', res);
    // });
  }

  upload() {
    const canvas = this.canvas.nativeElement;
    const d = canvas.toDataURL('image/png');
    const base = {
      base64: d
    };
    this.uploadImage(base).subscribe((res: any) => {
      console.log('upload result', res);
    });
  }

  uploadImage(base: any) {
    return this._http.post<any>(imageUrlSrc + 'images/upload', base);
  }

  getImages() {
    this._http.get<any>(imageUrlSrc + 'images/list').subscribe((images: any) => {
      this.images = [...images];
    });
  }

  applyFrame(index: number) {
    const baseImage = new Image();
    baseImage.src = frameImages[index];
    const canvas = this.canvas.nativeElement;
    const context = canvas.getContext('2d');
    context.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
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
    } else if (topWord === commands.DOWN) {
      if (this.currentFrame !== 6) {
        this.currentFrame += 1;
        this.recapture();
        this.applyFrame(this.currentFrame);
      }
    } else if (topWord === commands.UP) {
      if (this.currentFrame !== 1) {
        this.currentFrame -= 1;
        this.recapture();
        this.applyFrame(this.currentFrame);
      }
    } else if (topWord === commands.THREE) {
      this.capture();
    } else if (topWord === commands.YES) {
      this.upload();
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
