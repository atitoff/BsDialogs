class BsDialogs {
    get _options_default() {
        return {
            centered: true,
            backdrop: 'static',
            keyboard: true,
            focus: true,
            close: true,
            size: '',
            fullscreen: null,
            scrollable: false
        }
    }

    constructor(options = {}) {
        const _this = this
        this._recalculate_z_index()
        this._options = Object.assign({}, this._options_default, options)
        this._bs_options = {
            backdrop: this._options.backdrop,
            keyboard: this._options.keyboard,
            focus: this._options.focus
        }
        this._modal_div = document.createElement('div')
        this._modal_div.className = 'modal fade'
        this._modal_div.tabIndex = -1
        this._modal_div.insertAdjacentHTML('beforeend', this._modal_html())
        this._modal_header = this._modal_div.querySelector('h5.modal-title')
        this._modal_body = this._modal_div.querySelector('div.modal-body')
        this._modal_footer = this._modal_div.querySelector('div.modal-footer')
        this._modal_close = this._modal_div.querySelector('button.btn-close')
        document.body.appendChild(this._modal_div)
    }

    _modal_html() {
        let cls = ['modal-dialog']
        if (this._options.centered) {
            cls.push('modal-dialog-centered')
        }
        if (this._options.size !== '') {
            cls.push('modal-' + this._options.size)
        }
        if (this._options.fullscreen !== null) {
            if (this._options.fullscreen === '') {
                cls.push('modal-fullscreen')
            } else {
                cls.push('modal-fullscreen-' + this._options.fullscreen)
            }
        }
        if (this._options.scrollable) {
            cls.push('modal-dialog-scrollable')
        }


        let close_btn = `<button type="button" class="btn-close" data-ret="" aria-label="Close"></button>`
        if (!this._options.close) {
            close_btn = ''
        }

        return `<div class="${cls.join(' ')}">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title"></h5>${close_btn}
      </div>
      <div class="modal-body"></div>
      <div class="modal-footer"></div>
    </div>
  </div>`
    }

    _serialize_form(frm) {
        let ret_dict = {}
        const selectors = frm.querySelectorAll("input")
        selectors.forEach(function (selector) {
            if (selector.dataset.name) {
                if (selector.type === 'checkbox') {
                    if (selector.checked && selector.name) {
                        try {
                            ret_dict[selector.name].push(selector.dataset.name)
                        } catch {
                            ret_dict[selector.name] = []
                            ret_dict[selector.name].push(selector.dataset.name)
                        }
                    }
                } else {
                    ret_dict[selector.dataset.name] = selector.value
                }
            } else {
                if (selector.type === 'radio') {
                    if (selector.checked && selector.name) {
                        ret_dict[selector.name] = selector.value
                    }
                }
            }

        });
        return ret_dict
    }

    _recalculate_z_index() {
        document.addEventListener('shown.bs.modal', function (e) {
            let el = e.target
            let all_modal = document.querySelectorAll('.modal')
            let zIndex = 1040
            all_modal.forEach(function (el) {
                if (getComputedStyle(el).display !== 'none')
                    zIndex += 10
            })
            el.style.zIndex = zIndex.toString()
            setTimeout(function () {
                //$('.modal-backdrop').not('.modal-stack').css('z-index', zIndex - 1).addClass('modal-stack');
                let modal_backdrop = document.querySelectorAll('.modal-backdrop')
                modal_backdrop.forEach(function (el) {
                    if (!el.classList.contains('modal-stack')) {
                        el.style.zIndex = (zIndex - 1).toString()
                        el.classList.add('modal-stack')
                    }
                })
            }, 0);
        })
    }

    custom(header, body, buttons = []) {
        const _this = this
        this._modal_header.innerHTML = header
        this._modal_body.innerHTML = body
        for (let button of buttons) {
            let btn_el = document.createElement('button')
            btn_el.className = 'btn ' + button[1]
            btn_el.textContent = button[0]
            btn_el.dataset.ret = button[2]
            this._modal_footer.appendChild(btn_el)
        }
        this._modal_bs = new bootstrap.Modal(this._modal_div, _this._bs_options)
        this._modal_bs.show()
        return new Promise((resolve, reject) => {
            for (let button of _this._modal_div.querySelectorAll('button[data-ret]')) {
                button.addEventListener("click", function (e) {
                    _this.close()
                    if (e.target.dataset.ret === '') {
                        e.target.dataset.ret = undefined
                    }
                    resolve(e.target.dataset.ret)
                })
            }
            _this._modal_div.addEventListener('hidden.bs.modal', function () {
                resolve(undefined)
                _this.close()
            })
        })
    }

    async ok_cancel(header, body) {
        return await this.custom(header, body, [['Cancel', 'btn-secondary', 'cancel'], ['Ok', 'btn-primary', 'ok']])
    }

    async yes_no(header, body) {
        return await this.custom(header, body, [['No', 'btn-secondary', 'no'], ['Yes', 'btn-primary', 'yes']])
    }

    async ok(header, body) {
        return await this.custom(header, body, [['Ok', 'btn-primary', 'ok']])
    }

    form(header, ok_btn_text, form) {
        const _this = this
        this._modal_header.innerHTML = header
        this._modal_body.innerHTML = form
        this._modal_bs = new bootstrap.Modal(this._modal_div, this._bs_options)
        this._form_el = this._modal_body.querySelector('form')
        //
        let submit_btn = document.createElement('button')
        submit_btn.hidden = true
        submit_btn.type = 'submit'
        this._form_el.appendChild(submit_btn)
        //
        let ok_btn = document.createElement('button')
        ok_btn.className = 'btn btn-primary'
        ok_btn.textContent = ok_btn_text
        ok_btn.onclick = function () {
            submit_btn.click()
        }
        this._modal_footer.appendChild(ok_btn)
        //
        this._modal_bs.show()

    }

    async onsubmit(loop = false) {
        const _this = this
        return new Promise((resolve, reject) => {
            _this._form_el.onsubmit = function (e) {
                e.preventDefault()
                resolve(_this._serialize_form(_this._form_el))
                if (!loop) {
                    _this.close()
                }
            }

            _this._modal_close.onclick = function () {
                resolve(undefined)
                _this.close()
            }

            _this._modal_div.addEventListener('hidden.bs.modal', function () {
                resolve(undefined)
                _this.close()
            })
        })
    }

    close() {
        try {
            this._modal_bs.hide()
            this._modal_div.remove()
        } catch {
        }
    }

    set append_body(el) {
        this._modal_body.appendChild(el)
    }
}