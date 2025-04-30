import os
from flask import Blueprint, render_template, jsonify, request, send_from_directory, url_for, redirect
from CTFd.models import Challenges, Flags, db
from CTFd.utils.decorators import admins_only
from CTFd.utils import get_config
from sqlalchemy import or_
import json

# Model to store the challenge layout
class ChallengeLayout(db.Model):
    __tablename__ = "challenge_layout"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text, default="default")
    value = db.Column(db.JSON, default={})

    def __init__(self, name="default", value=None):
        self.name = name
        if value is None:
            self.value = {}
        else:
            self.value = value

def load(app):
    dir_path = os.path.dirname(os.path.realpath(__file__))
    
    # Create the layout table if it doesn't exist
    with app.app_context():
        db.create_all()
        # Check if we already have an entry for the layout
        if not ChallengeLayout.query.filter_by(name="default").first():
            default_layout = ChallengeLayout(name="default", value={})
            db.session.add(default_layout)
            db.session.commit()
    
    plugin_name = "bulk_challenge_manager"
    blueprint = Blueprint(
        plugin_name,
        __name__,
        template_folder="templates",
        static_folder="assets",
        url_prefix="/plugins/bulk-challenge-manager"
    )
    
    @blueprint.route('/assets/<path:path>')
    def assets(path):
        return send_from_directory(os.path.join(dir_path, 'assets'), path)
    
    @blueprint.route("/admin", methods=["GET"])
    @admins_only
    def admin_page():
        return render_template("bulk_manager.html")
        
    # Route for the challenge map
    @blueprint.route("/map", methods=["GET"])
    @admins_only
    def challenge_map():
        return render_template("challenge_map.html")
    
    # API to retrieve the saved layout of challenges
    @blueprint.route("/api/challenge-layout", methods=["GET"])
    @admins_only
    def get_challenge_layout():
        try:
            # Retrieve the layout from the database
            layout = ChallengeLayout.query.filter_by(name="default").first()
            
            if layout and layout.value:
                return jsonify({
                    "success": True,
                    "layout": layout.value
                })
            else:
                return jsonify({
                    "success": True,
                    "layout": {}
                })
        except Exception as e:
            return jsonify({"success": False, "message": str(e)}), 500
    
    # API to save the challenge layout
    @blueprint.route("/api/challenge-layout", methods=["POST"])
    @admins_only
    def save_challenge_layout():
        try:
            data = request.json
            layout_data = data.get('layout', {})
            
            # Save to the database
            layout = ChallengeLayout.query.filter_by(name="default").first()
            if layout:
                layout.value = layout_data
            else:
                layout = ChallengeLayout(name="default", value=layout_data)
                db.session.add(layout)
            
            db.session.commit()
            
            return jsonify({"success": True, "message": "Layout saved successfully"})
        except Exception as e:
            db.session.rollback()
            return jsonify({"success": False, "message": str(e)}), 500
    
    @blueprint.route("/api/challenges", methods=["GET"])
    @admins_only
    def get_challenges():
        """Get all challenges with their flags."""
        try:
            # Get query parameters for filtering
            category = request.args.get('category')
            search = request.args.get('search')
            state = request.args.get('state')
            
            # Base query
            query = Challenges.query
            
            # Apply filters if they exist
            if category:
                query = query.filter(Challenges.category == category)
            if state:
                query = query.filter(Challenges.state == state)
            if search:
                query = query.filter(or_(
                    Challenges.name.ilike(f'%{search}%'),
                    Challenges.description.ilike(f'%{search}%')
                ))
            
            # Get all challenges
            all_challenges = query.all()
            
            # Format response
            response = []
            for challenge in all_challenges:
                # Get flags for each challenge
                flags = Flags.query.filter_by(challenge_id=challenge.id).all()
                flag_data = []
                for flag in flags:
                    flag_data.append({
                        'id': flag.id,
                        'type': flag.type,
                        'content': flag.content,
                        'data': flag.data
                    })
                
                # Build challenge data
                challenge_data = {
                    'id': challenge.id,
                    'name': challenge.name,
                    'description': challenge.description,
                    'max_attempts': challenge.max_attempts,
                    'value': challenge.value,
                    'category': challenge.category,
                    'type': challenge.type,
                    'state': challenge.state,
                    'requirements': challenge.requirements,
                    'connection_info': challenge.connection_info,
                    'next_id': challenge.next_id,
                    'attribution': challenge.attribution,
                    'flags': flag_data
                }
                response.append(challenge_data)
            
            # Get all unique categories for filter dropdown
            categories = db.session.query(Challenges.category).distinct().all()
            categories = [c[0] for c in categories if c[0]]
            
            return jsonify({
                'success': True,
                'challenges': response,
                'categories': categories
            })
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
    
    @blueprint.route("/api/challenges/<int:challenge_id>", methods=["PUT"])
    @admins_only
    def update_challenge(challenge_id):
        """Update a single challenge."""
        try:
            challenge = Challenges.query.get(challenge_id)
            if not challenge:
                return jsonify({'success': False, 'message': 'Challenge not found'}), 404
            
            data = request.json
            
            # Update challenge fields
            if 'name' in data:
                challenge.name = data['name']
            if 'description' in data:
                challenge.description = data['description']
            if 'max_attempts' in data:
                challenge.max_attempts = data['max_attempts']
            if 'value' in data:
                challenge.value = data['value']
            if 'category' in data:
                challenge.category = data['category']
            if 'state' in data:
                challenge.state = data['state']
            
            if 'requirements' in data:
                if isinstance(data['requirements'], dict):
                    challenge.requirements = data['requirements']
                elif isinstance(data['requirements'], str):
                    try:
                        challenge.requirements = json.loads(data['requirements'])
                    except:
                        challenge.requirements = data['requirements']
                else:
                    challenge.requirements = data['requirements']
                    
            if 'connection_info' in data:
                challenge.connection_info = data['connection_info']
            if 'attribution' in data:
                challenge.attribution = data['attribution']
            
            if 'flags' in data:
                # Get current flags to be able to identify removed flags
                current_flags = Flags.query.filter_by(challenge_id=challenge.id).all()
                current_flag_ids = [flag.id for flag in current_flags]
                updated_flag_ids = []
                
                for flag_data in data['flags']:
                    if 'id' in flag_data and flag_data['id']:
                        # Update existing flag
                        flag_id = flag_data['id']
                        updated_flag_ids.append(flag_id)
                        flag = Flags.query.get(flag_id)
                        if flag:
                            if 'content' in flag_data:
                                flag.content = flag_data['content']
                            if 'type' in flag_data:
                                flag.type = flag_data['type']
                            # Make sure data is properly processed
                            if 'data' in flag_data:
                                # If data is empty string or None, it represents case_sensitive
                                # Only set to 'case_insensitive' when explicitly provided
                                if flag_data['data'] == 'case_insensitive':
                                    flag.data = 'case_insensitive'
                                else:
                                    flag.data = ''
                    else:
                        # Create new flag
                        new_flag = Flags(
                            challenge_id=challenge.id,
                            type=flag_data.get('type', 'static'),
                            content=flag_data.get('content', '')
                        )
                        
                        # Handle case sensitivity specifically
                        if flag_data.get('data') == 'case_insensitive':
                            new_flag.data = 'case_insensitive'
                        else:
                            new_flag.data = ''
                            
                        db.session.add(new_flag)
                
                # Remove flags that weren't in the update
                for flag_id in current_flag_ids:
                    if flag_id not in updated_flag_ids:
                        flag_to_delete = Flags.query.get(flag_id)
                        if flag_to_delete:
                            db.session.delete(flag_to_delete)
            
            db.session.commit()
            return jsonify({'success': True, 'message': 'Challenge updated successfully'})
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'message': str(e)}), 500
    
    @blueprint.route("/api/flags/<int:flag_id>", methods=["DELETE"])
    @admins_only
    def delete_flag(flag_id):
        """Delete a flag."""
        try:
            flag = Flags.query.get(flag_id)
            if not flag:
                return jsonify({'success': False, 'message': 'Flag not found'}), 404
            
            db.session.delete(flag)
            db.session.commit()
            return jsonify({'success': True, 'message': 'Flag deleted successfully'})
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'message': str(e)}), 500
    
    @blueprint.route("/api/bulk-update", methods=["PUT"])
    @admins_only
    def bulk_update_challenges():
        """Update multiple challenges at once."""
        try:
            data = request.json
            challenge_ids = data.get('challenge_ids', [])
            updates = data.get('updates', {})
            
            if not challenge_ids:
                return jsonify({'success': False, 'message': 'No challenge IDs provided'}), 400
            
            challenges = Challenges.query.filter(Challenges.id.in_(challenge_ids)).all()
            
            for challenge in challenges:
                # Handle category update
                if 'category' in updates:
                    challenge.category = updates['category']
                
                # Handle max_attempts update
                if 'max_attempts' in updates:
                    challenge.max_attempts = updates['max_attempts']
                
                # Handle value update - either absolute or relative
                if 'value' in updates:
                    value_data = updates['value']
                    if 'mode' in value_data:
                        if value_data['mode'] == 'absolute':
                            challenge.value = value_data['value']
                        elif value_data['mode'] == 'relative':
                            # For relative mode, add/subtract the specified amount
                            challenge.value = challenge.value + value_data['value']
                
                # Handle state update
                if 'state' in updates:
                    challenge.state = updates['state']
            
            db.session.commit()
            return jsonify({'success': True, 'message': f'Updated {len(challenges)} challenges'})
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'message': str(e)}), 500
    
    # Get flag types for dropdown
    @blueprint.route("/api/flag-types", methods=["GET"])
    @admins_only
    def get_flag_types():
        """Get all available flag types."""
        from CTFd.plugins import get_plugin_names
        from CTFd.plugins.challenges import get_chal_class
        
        try:
            available_flag_types = ["static"]  # Default flag type
            
            # Gather flag types from plugins
            for plugin in get_plugin_names():
                try:
                    plugin_challenge = get_chal_class(plugin)
                    if hasattr(plugin_challenge, 'flag_types'):
                        available_flag_types.extend(plugin_challenge.flag_types)
                except:
                    pass
            
            # Remove duplicates
            available_flag_types = list(set(available_flag_types))
            
            return jsonify({
                'success': True,
                'types': available_flag_types
            })
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
    
    app.register_blueprint(blueprint)